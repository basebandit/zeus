# Testing Guide

This document describes the testing strategy and how to run tests for the Zeus microservices platform.

## Testing Strategy

The Zeus platform implements a comprehensive testing strategy across three layers:

### 1. Unit Tests

Unit tests verify individual components in isolation with mocked dependencies.

#### Orders Service (TypeScript/Jest)
- Location: `apps/orders/src/**/*.spec.ts`
- Framework: Jest with NestJS testing utilities
- Run: `cd apps/orders && npm test`
- Coverage: `npm run test:cov`

#### Inventory Service (Go)
- Location: `apps/inventory/internal/**/*_test.go`
- Framework: Go testing package with testify
- Run: `cd apps/inventory && go test ./...`
- Coverage: `go test -cover ./...`

#### Payments Service (Python/pytest)
- Location: `apps/payments/tests/test_*.py`
- Framework: pytest with pytest-asyncio
- Run: `cd apps/payments && uv run pytest`
- Coverage: `uv run pytest --cov=app --cov-report=html`

### 2. Integration Tests

Integration tests verify event-driven flows across multiple services.

- Location: `tests/integration/`
- Framework: pytest
- Run: `pytest -m integration`
- Prerequisites: All services and RabbitMQ must be running

### 3. End-to-End Tests

E2E tests verify complete user journeys.

- Script: `apps/orders/test-api.sh`
- Tests complete order creation → payment → confirmation flow

## Running Tests

### Prerequisites

```bash
# Install dependencies for each service
cd apps/orders && npm install
cd apps/inventory && go mod download
cd apps/payments && uv sync
```

### Unit Tests Only

```bash
# Orders
cd apps/orders
npm test

# Inventory
cd apps/inventory
go test ./...

# Payments
cd apps/payments
uv run pytest
```

### With Coverage

```bash
# Orders
cd apps/orders
npm run test:cov
# Opens coverage report in coverage/index.html

# Inventory
cd apps/inventory
go test -cover -coverprofile=coverage.out ./...
go tool cover -html=coverage.out

# Payments
cd apps/payments
uv run pytest --cov=app --cov-report=html
# Opens coverage report in htmlcov/index.html
```

### Integration Tests

```bash
# Start all services first
docker-compose up -d  # RabbitMQ
cd apps/orders && npm run start:dev &
cd apps/inventory && make run &
cd apps/payments && make dev &

# Run integration tests
pytest -m integration tests/integration/

# Or run specific test
pytest tests/integration/test_saga_flow.py::TestSagaFlow::test_happy_path_order_completion
```

### End-to-End Test

```bash
# Ensure all services are running
cd apps/orders
./test-api.sh
```

## Test Structure

### Orders Service Tests

```
apps/orders/src/
├── services/
│   ├── order.service.spec.ts       # Order service unit tests
│   └── redis.service.spec.ts       # Redis service unit tests
├── events/
│   ├── payment.handler.spec.ts     # Payment event handler tests
│   └── inventory.handler.spec.ts   # Inventory event handler tests
```

**Coverage:**
- Cart operations (add, remove, update)
- Order creation and validation
- Order status transitions
- Event publishing and handling
- Payment completion/failure handling

### Inventory Service Tests

```
apps/inventory/internal/
└── service/
    └── inventory_service_test.go   # Inventory service unit tests
```

**Coverage:**
- Product creation
- Inventory reservation (successful, insufficient stock)
- Inventory release
- Reservation confirmation
- Low stock detection
- Inventory restocking
- Reservation expiration

### Payments Service Tests

```
apps/payments/tests/
├── conftest.py                     # Pytest fixtures
├── test_payment_service.py         # Payment service unit tests
├── test_payment_gateway.py         # Payment gateway unit tests
└── test_event_handlers.py          # Event handler unit tests
```

**Coverage:**
- Payment creation and validation
- Payment processing (success/failure)
- Payment gateway simulation
- Event schema validation
- Payment status transitions
- Idempotency

### Integration Tests

```
tests/integration/
└── test_saga_flow.py               # SAGA pattern integration tests
```

**Coverage:**
- Happy path: Order → Inventory → Payment → Confirmation
- Compensation: Payment failure → Order cancellation → Inventory release
- Concurrent reservations
- Event idempotency
- Retry mechanisms
- Dead letter queue handling

## Test Markers

### Payments Service

```bash
# Run only unit tests
uv run pytest -m unit

# Run only integration tests (requires services)
uv run pytest -m integration

# Run slow tests
uv run pytest -m slow
```

### Integration Tests

```bash
# Skip integration tests (default)
pytest

# Run only integration tests
pytest -m integration
```

## Continuous Integration

Tests are automatically run in CI/CD pipeline:

1. **Pull Request**: All unit tests must pass
2. **Merge to main**: Unit + Integration tests
3. **Release**: Full test suite including E2E

## Test Data

### Sample UUIDs for Testing
```
Order ID:    123e4567-e89b-12d3-a456-426614174000
User ID:     123e4567-e89b-12d3-a456-426614174001
Product ID:  123e4567-e89b-12d3-a456-426614174002
```

### Sample Products
```json
{
  "id": "123e4567-e89b-12d3-a456-426614174002",
  "name": "Test Product",
  "sku": "TEST-001",
  "price": 29.99,
  "currency": "USD"
}
```

## Troubleshooting

### Common Issues

**Tests fail with database connection error**
```bash
# Ensure database is running
docker-compose up -d postgres
```

**RabbitMQ connection timeout**
```bash
# Check RabbitMQ is running
docker ps | grep rabbitmq
# Restart if needed
docker-compose restart rabbitmq
```

**Port already in use**
```bash
# Kill process on port
lsof -ti:8080 | xargs kill -9  # Orders
lsof -ti:8081 | xargs kill -9  # Inventory
lsof -ti:8083 | xargs kill -9  # Payments
```

**Import errors in Python tests**
```bash
# Ensure in correct directory and virtual env activated
cd apps/payments
uv sync
uv run pytest
```

## Best Practices

1. **Write tests first**: TDD approach ensures better design
2. **Keep tests isolated**: Each test should be independent
3. **Use meaningful names**: Test names should describe what they verify
4. **Mock external dependencies**: Unit tests should not depend on external services
5. **Test error cases**: Don't just test happy paths
6. **Maintain test data**: Use fixtures and factories for test data
7. **Keep tests fast**: Unit tests should run in milliseconds
8. **Clean up**: Tests should clean up any resources they create

## Coverage Goals

- **Unit Tests**: 80%+ code coverage
- **Integration Tests**: Cover all critical SAGA flows
- **E2E Tests**: Cover main user journeys

## Contributing

When adding new features:

1. Write unit tests for new code
2. Update integration tests if event flow changes
3. Ensure all existing tests pass
4. Add tests to cover edge cases
5. Update this documentation if adding new test types
