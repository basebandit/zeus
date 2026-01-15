.PHONY: help install dev build up down logs clean migration-run migration-revert test

help: ## Show this help message
	@echo 'Usage: make [target]'
	@echo ''
	@echo 'Available targets:'
	@awk 'BEGIN {FS = ":.*?## "} /^[a-zA-Z_-]+:.*?## / {printf "  %-20s %s\n", $$1, $$2}' $(MAKEFILE_LIST)

install: ## Install dependencies
	npm install

dev: ## Run in development mode (locally)
	npm run start:dev

build: ## Build the application
	npm run build

up: ## Start infrastructure only (for local dev)
	docker-compose up -d

up-all: ## Start all services including app
	docker-compose --profile app up -d

down: ## Stop all services
	docker-compose down

logs: ## View logs from infrastructure services
	docker-compose logs -f

logs-orders: ## View logs from orders service only
	docker-compose logs -f orders-service

clean: ## Stop services and remove volumes
	docker-compose down -v

migration-generate: ## Generate a new migration (usage: make migration-generate name=MigrationName)
	npm run typeorm -- migration:generate src/migrations/$(name) -d src/config/typeorm.config.ts

migration-run: ## Run pending migrations
	npm run migration:run

migration-revert: ## Revert last migration
	npm run migration:revert

migration-run-docker: ## Run migrations inside docker container
	docker-compose exec orders-service npm run migration:run

test: ## Run tests
	npm run test

test-cov: ## Run tests with coverage
	npm run test:cov

lint: ## Run linter
	npm run lint

format: ## Format code
	npm run format

rebuild: down ## Rebuild and restart all services
	docker-compose up -d --build

db-shell: ## Connect to PostgreSQL shell
	docker-compose exec postgres psql -U postgres -d orders

redis-cli: ## Connect to Redis CLI
	docker-compose exec redis redis-cli

rabbitmq-ui: ## Open RabbitMQ management UI
	@echo "Opening RabbitMQ Management UI at http://localhost:15672"
	@echo "Username: guest, Password: guest"
