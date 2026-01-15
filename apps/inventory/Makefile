.PHONY: help build run test clean docker-up docker-up-app docker-down docker-logs docker-restart docker-ps migrate-create migrate-up migrate-down migrate-version swagger

# Database connection string
DB_URL := postgresql://postgres:postgres@localhost:5433/inventory?sslmode=disable

help: ## Show this help message
	@echo 'Usage: make [target]'
	@echo ''
	@echo 'Available targets:'
	@awk 'BEGIN {FS = ":.*?## "} /^[a-zA-Z_-]+:.*?## / {printf "  %-15s %s\n", $$1, $$2}' $(MAKEFILE_LIST)

build: ## Build the application
	go build -o bin/inventory-service ./cmd/server

run: ## Run the application
	go run ./cmd/server/main.go

test: ## Run tests
	go test -v -race -coverprofile=coverage.out ./...

test-coverage: test ## Run tests with coverage report
	go tool cover -html=coverage.out

clean: ## Clean build artifacts
	rm -rf bin/
	rm -f coverage.out

docker-up: ## Start infrastructure (Postgres + Redis)
	docker compose up -d

docker-up-app: ## Start infrastructure + application
	docker compose --profile app up -d --build

docker-down: ## Stop all services
	docker compose down

docker-logs: ## View service logs
	docker compose logs -f inventory-service

docker-restart: ## Restart services
	docker compose restart

docker-ps: ## Show running containers
	docker compose ps

# Migration commands
migrate-create: ## Create a new migration (usage: make migrate-create name=create_users)
	@test -n "$(name)" || (echo "Error: name parameter is required. Usage: make migrate-create name=migration_name" && exit 1)
	migrate create -ext sql -dir migrations -seq $(name)

migrate-up: ## Run all migrations up
	migrate -path migrations -database "$(DB_URL)" up

migrate-down: ## Rollback last migration
	migrate -path migrations -database "$(DB_URL)" down 1

migrate-down-all: ## Rollback all migrations (DANGER!)
	migrate -path migrations -database "$(DB_URL)" down

migrate-version: ## Show current migration version
	migrate -path migrations -database "$(DB_URL)" version

migrate-force: ## Force migration version (usage: make migrate-force version=1)
	@test -n "$(version)" || (echo "Error: version parameter is required. Usage: make migrate-force version=1" && exit 1)
	migrate -path migrations -database "$(DB_URL)" force $(version)

lint: ## Run linter
	golangci-lint run

fmt: ## Format code
	go fmt ./...

tidy: ## Tidy dependencies
	go mod tidy

swagger: ## Generate Swagger documentation
	swag init -g cmd/server/main.go --output docs

install-tools: ## Install development tools
	@echo "Installing golang-migrate..."
	go install -tags 'postgres' github.com/golang-migrate/migrate/v4/cmd/migrate@latest
	@echo "Installing golangci-lint..."
	go install github.com/golangci/golangci-lint/cmd/golangci-lint@latest
	@echo "Installing swag..."
	go install github.com/swaggo/swag/cmd/swag@latest
	@echo "Tools installed successfully!"
