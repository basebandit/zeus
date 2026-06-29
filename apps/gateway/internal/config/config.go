package config

import "os"

// Config holds the gateway runtime configuration.
type Config struct {
	Server    ServerConfig
	JWTSecret string
	WebOrigin string
	Backends  Backends
}

type ServerConfig struct {
	Port string
	Host string
	Env  string
}

// Backends holds the upstream base URLs the gateway proxies to.
type Backends struct {
	Auth      string
	Orders    string
	Inventory string
	Payments  string
	Shipping  string
}

func Load() *Config {
	return &Config{
		Server: ServerConfig{
			Port: getEnv("PORT", "8081"),
			Host: getEnv("HOST", "0.0.0.0"),
			Env:  getEnv("ENV", "development"),
		},
		JWTSecret: getEnv("JWT_SECRET", "dev-insecure-jwt-secret-change-me-in-prod-0123456789"),
		WebOrigin: getEnv("WEB_ORIGIN", "http://localhost:3000"),
		Backends: Backends{
			Auth:      getEnv("AUTH_URL", "http://localhost:8084"),
			Orders:    getEnv("ORDERS_URL", "http://localhost:8080"),
			Inventory: getEnv("INVENTORY_URL", "http://localhost:8082"),
			Payments:  getEnv("PAYMENTS_URL", "http://localhost:8083"),
			Shipping:  getEnv("SHIPPING_URL", "http://localhost:8085"),
		},
	}
}

func getEnv(key, fallback string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return fallback
}
