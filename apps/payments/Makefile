.PHONY: help install dev test clean docker-up docker-down docker-logs migrate-up migrate-down migrate-create

help: ## Show this help message
	@echo 'Usage: make [target]'
	@echo ''
	@echo 'Available targets:'
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-20s\033[0m %s\n", $$1, $$2}'

install: ## Install dependencies
	uv sync

dev: ## Run development server
	uv run uvicorn main:app --reload --host 0.0.0.0 --port 8083

test: ## Run tests
	uv run pytest

clean: ## Clean build artifacts
	rm -rf __pycache__ .pytest_cache .mypy_cache .ruff_cache
	find . -type d -name __pycache__ -exec rm -rf {} +
	find . -type f -name '*.pyc' -delete

docker-up: ## Start all services with Docker Compose
	docker-compose up -d

docker-up-db: ## Start only PostgreSQL database
	docker-compose up -d postgres

docker-down: ## Stop all services
	docker-compose down

docker-logs: ## View logs from all services
	docker-compose logs -f

docker-clean: ## Stop and remove all containers, volumes, and networks
	docker-compose down -v

migrate-create: ## Create a new migration (usage: make migrate-create MSG="migration message")
	@if [ -z "$(MSG)" ]; then \
		echo "Error: MSG is required. Usage: make migrate-create MSG=\"migration message\""; \
		exit 1; \
	fi
	uv run alembic revision --autogenerate -m "$(MSG)"

migrate-up: ## Run all pending migrations
	uv run alembic upgrade head

migrate-down: ## Rollback last migration
	uv run alembic downgrade -1

migrate-history: ## Show migration history
	uv run alembic history

migrate-current: ## Show current migration version
	uv run alembic current

format: ## Format code with ruff
	uv run ruff format .

lint: ## Lint code with ruff
	uv run ruff check .

lint-fix: ## Lint and fix code with ruff
	uv run ruff check --fix .

type-check: ## Run type checking with mypy
	uv run mypy .

check: lint type-check ## Run all checks (lint + type-check)
