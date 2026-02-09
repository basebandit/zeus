package main

import (
	"fmt"
	"log"
	"os"
	"os/signal"
	"syscall"

	"github.com/basebandit/zeus/inventory/internal/config"
	"github.com/basebandit/zeus/inventory/internal/events"
	"github.com/basebandit/zeus/inventory/internal/handler"
	"github.com/basebandit/zeus/inventory/internal/repository"
	"github.com/basebandit/zeus/inventory/internal/service"
	"github.com/gin-gonic/gin"
	"github.com/golang-migrate/migrate/v4"
	migratepostgres "github.com/golang-migrate/migrate/v4/database/postgres"
	_ "github.com/golang-migrate/migrate/v4/source/file"
	swaggerFiles "github.com/swaggo/files"
	ginSwagger "github.com/swaggo/gin-swagger"
	gormpostgres "gorm.io/driver/postgres"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"

	_ "github.com/basebandit/zeus/inventory/docs" // Swagger docs
)

// @title Inventory Service API
// @version 1.0
// @description Inventory and product management API for the Inventory service
// @termsOfService http://swagger.io/terms/

// @contact.name API Support
// @contact.url http://www.swagger.io/support
// @contact.email support@swagger.io

// @license.name Apache 2.0
// @license.url http://www.apache.org/licenses/LICENSE-2.0.html

// @host localhost:8082
// @BasePath /api/v1
// @schemes http https

func main() {
	log.SetFlags(log.LstdFlags | log.Lshortfile)

	cfg := config.Load()

	db, err := initDatabase(cfg)
	if err != nil {
		log.Fatalf("Failed to initialize database: %v", err)
	}

	err = runMigrations(db)
	if err != nil {
		log.Fatalf("Failed to run migrations: %v", err)
	}

	inventoryRepo := repository.NewInventoryRepository(db)
	inventoryService := service.NewInventoryService(inventoryRepo)

	rabbitMQ, err := events.NewRabbitMQService(cfg.RabbitMQ.URL, cfg.RabbitMQ.Exchange)
	if err != nil {
		log.Fatalf("Failed to initialize RabbitMQ: %v", err)
	}

	eventHandler := events.NewEventHandler(inventoryService, rabbitMQ)
	if err := eventHandler.StartConsumers(); err != nil {
		rabbitMQ.Close()
		log.Fatalf("Failed to start event consumers: %v", err)
	}
	defer rabbitMQ.Close()

	scheduler := service.NewReservationScheduler(inventoryService)
	scheduler.Start()
	defer scheduler.Stop()

	if cfg.Server.Env == "production" {
		gin.SetMode(gin.ReleaseMode)
	}

	router := gin.New()
	router.Use(gin.Recovery())
	router.Use(gin.Logger())

	inventoryHandler := handler.NewInventoryHandler(inventoryService, rabbitMQ)
	productHandler := handler.NewProductHandler(inventoryRepo)

	setupRoutes(router, inventoryHandler, productHandler)

	go func() {
		sigChan := make(chan os.Signal, 1)
		signal.Notify(sigChan, syscall.SIGINT, syscall.SIGTERM)
		<-sigChan
		log.Println("Shutting down gracefully...")
		scheduler.Stop()
		rabbitMQ.Close()
		os.Exit(0)
	}()

	addr := fmt.Sprintf("%s:%s", cfg.Server.Host, cfg.Server.Port)
	log.Printf("Inventory service starting on %s", addr)
	log.Printf("API Documentation available at: http://localhost:%s/api/docs/index.html", cfg.Server.Port)
	if err := router.Run(addr); err != nil {
		log.Fatalf("Failed to start server: %v", err)
	}
}

func initDatabase(cfg *config.Config) (*gorm.DB, error) {
	db, err := gorm.Open(gormpostgres.Open(cfg.Database.DSN()), &gorm.Config{
		Logger: logger.Default.LogMode(logger.Info),
	})
	if err != nil {
		return nil, fmt.Errorf("failed to connect to database: %w", err)
	}

	sqlDB, err := db.DB()
	if err != nil {
		return nil, err
	}

	sqlDB.SetMaxIdleConns(10)
	sqlDB.SetMaxOpenConns(100)

	log.Println("Database connection established")
	return db, nil
}

func runMigrations(db *gorm.DB) error {
	runMigrationsOnStartup := os.Getenv("RUN_MIGRATIONS_ON_STARTUP")

	sqlDB, err := db.DB()
	if err != nil {
		return fmt.Errorf("failed to get database connection: %w", err)
	}

	driver, err := migratepostgres.WithInstance(sqlDB, &migratepostgres.Config{})
	if err != nil {
		return fmt.Errorf("failed to create migration driver: %w", err)
	}

	m, err := migrate.NewWithDatabaseInstance(
		"file://migrations",
		"postgres",
		driver,
	)
	if err != nil {
		return fmt.Errorf("failed to create migration instance: %w", err)
	}

	version, dirty, err := m.Version()
	if err != nil && err != migrate.ErrNilVersion {
		return fmt.Errorf("failed to get migration version: %w", err)
	}

	if dirty {
		return fmt.Errorf("database is in dirty state at version %d - manual intervention required", version)
	}

	if runMigrationsOnStartup == "true" {
		log.Println("Running database migrations (development mode)...")
		if err := m.Up(); err != nil && err != migrate.ErrNoChange {
			return fmt.Errorf("failed to run migrations: %w", err)
		}
		log.Println("Database migrations completed successfully")
	} else {
		log.Printf("Migration verification: current version is %d", version)
		if err := m.Up(); err != nil && err != migrate.ErrNoChange {
			log.Printf("WARNING: Pending migrations detected. Run 'make migrate-up' before deployment.")
			log.Printf("Migration error: %v", err)
		}
	}

	return nil
}

func setupRoutes(router *gin.Engine, inventoryHandler *handler.InventoryHandler, productHandler *handler.ProductHandler) {
	router.GET("/healthz", func(c *gin.Context) {
		c.JSON(200, gin.H{
			"status":  "healthy",
			"service": "inventory",
		})
	})

	router.GET("/api/docs/*any", ginSwagger.WrapHandler(swaggerFiles.Handler))

	v1 := router.Group("/api/v1")

	products := v1.Group("/products")
	products.GET("", productHandler.ListProducts)
	products.GET("/:id", productHandler.GetProduct)
	products.POST("", productHandler.CreateProduct)
	products.PUT("/:id", productHandler.UpdateProduct)
	products.DELETE("/:id", productHandler.DeleteProduct)

	inventory := v1.Group("/inventory")
	inventory.POST("/reserve", inventoryHandler.ReserveStock)
	inventory.POST("/release", inventoryHandler.ReleaseReservation)
	inventory.POST("/confirm/:reservationId", inventoryHandler.ConfirmReservation)
	inventory.GET("/:productId/stock", inventoryHandler.GetStock)
	inventory.POST("/:productId/add-stock", inventoryHandler.AddStock)
}
