package main

import (
	"fmt"
	"log"
	"net/http"

	"github.com/basebandit/zeus/gateway/internal/config"
	"github.com/basebandit/zeus/gateway/internal/middleware"
	"github.com/basebandit/zeus/gateway/internal/proxy"
	"github.com/gin-gonic/gin"
)

func main() {
	log.SetFlags(log.LstdFlags | log.Lshortfile)
	cfg := config.Load()

	if cfg.Server.Env == "production" {
		gin.SetMode(gin.ReleaseMode)
	}

	router := gin.New()
	router.Use(gin.Recovery())
	router.Use(gin.Logger())
	router.Use(corsMiddleware(cfg.WebOrigin))

	router.GET("/healthz", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{"status": "healthy", "service": "gateway"})
	})

	setupRoutes(router, cfg)

	addr := fmt.Sprintf("%s:%s", cfg.Server.Host, cfg.Server.Port)
	log.Printf("Gateway service starting on %s", addr)
	if err := router.Run(addr); err != nil {
		log.Fatalf("Failed to start server: %v", err)
	}
}

func setupRoutes(router *gin.Engine, cfg *config.Config) {
	auth := proxy.MustNew(cfg.Backends.Auth)
	orders := proxy.MustNew(cfg.Backends.Orders)
	inventory := proxy.MustNew(cfg.Backends.Inventory)
	payments := proxy.MustNew(cfg.Backends.Payments)
	shipping := proxy.MustNew(cfg.Backends.Shipping)

	api := router.Group("/api/v1", middleware.Auth(cfg.JWTSecret))

	// Auth service (public; login/register/refresh + protected /me).
	api.Any("/auth/*path", auth)

	// Catalog (GET public, writes require auth — enforced by the middleware).
	api.Any("/products", inventory)
	api.Any("/products/*path", inventory)
	api.Any("/inventory/*path", inventory)

	// Orders + cart (protected).
	api.Any("/cart", orders)
	api.Any("/cart/*path", orders)
	api.Any("/orders", orders)
	api.Any("/orders/*path", orders)

	// Payments (protected).
	api.Any("/payments", payments)
	api.Any("/payments/*path", payments)

	// Shipping (protected).
	api.Any("/shipments", shipping)
	api.Any("/shipments/*path", shipping)
}

// corsMiddleware allows the web origin to call the gateway with credentials.
func corsMiddleware(origin string) gin.HandlerFunc {
	return func(c *gin.Context) {
		c.Header("Access-Control-Allow-Origin", origin)
		c.Header("Access-Control-Allow-Credentials", "true")
		c.Header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, PATCH, OPTIONS")
		c.Header("Access-Control-Allow-Headers", "Authorization, Content-Type")
		if c.Request.Method == http.MethodOptions {
			c.AbortWithStatus(http.StatusNoContent)
			return
		}
		c.Next()
	}
}
