# Inventory Service

Go-based microservice for managing product catalog and inventory with real-time stock tracking and reservation system.

## Features

- **Product CRUD Operations**: Manage product catalog
- **Real-time Stock Tracking**: Track available and reserved inventory
- **Reservation System**: Reserve inventory with 15-minute TTL
- **Optimistic Locking**: Handle concurrent stock updates safely
- **Background Jobs**: Automatic release of expired reservations
- **Event-Driven**: RabbitMQ integration for Saga pattern
- **Low Stock Alerts**: Automatic notifications when stock is low

## Tech Stack

- **Language**: Go 1.22
- **Framework**: Gin
- **ORM**: GORM
- **Database**: PostgreSQL
- **Message Queue**: RabbitMQ
- **Cache**: Redis

## Architecture

### Optimistic Locking

The service uses optimistic locking to prevent race conditions during concurrent stock updates:

```go
// Update with version check
UPDATE inventory
SET available_quantity = available_quantity - ?,
    reserved_quantity = reserved_quantity + ?,
    version = version + 1
WHERE product_id = ? AND version = ?
```

If the version doesn't match (another transaction modified it), the operation fails and retries.

### Reservation System

- **TTL**: 15 minutes (configurable)
- **Background Job**: Runs every 1 minute to release expired reservations
- **States**: active → confirmed/released/expired

## Database Schema

```sql
-- Products table
CREATE TABLE products (
    id UUID PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    sku VARCHAR(100) UNIQUE NOT NULL,
    price DECIMAL(10,2) NOT NULL,
    ...
);

-- Inventory table
CREATE TABLE inventory (
    id UUID PRIMARY KEY,
    product_id UUID UNIQUE NOT NULL,
    available_quantity INT NOT NULL,
    reserved_quantity INT NOT NULL,
    version INT NOT NULL,  -- For optimistic locking
    ...
);

-- Reservations table
CREATE TABLE reservations (
    id UUID PRIMARY KEY,
    product_id UUID NOT NULL,
    order_id UUID NOT NULL,
    quantity INT NOT NULL,
    status VARCHAR(20) NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    ...
);
```

## API Endpoints

### Products

```
GET    /api/v1/products           # List products (paginated)
GET    /api/v1/products/:id       # Get product details
POST   /api/v1/products           # Create product
PUT    /api/v1/products/:id       # Update product
DELETE /api/v1/products/:id       # Delete product
```

### Inventory

```
POST /api/v1/inventory/reserve              # Reserve stock
POST /api/v1/inventory/release              # Release reservation
POST /api/v1/inventory/confirm/:reservationId  # Confirm reservation
GET  /api/v1/inventory/:productId/stock     # Get stock levels
POST /api/v1/inventory/:productId/add-stock # Add stock (admin)
```

### Health

```
GET /healthz  # Health check
```

## Event Integration (Saga Pattern)

### Consumes

- `order.created` - Attempts to reserve inventory for order
- `order.cancelled` - Releases reserved inventory

### Publishes

- `inventory.reserved` - Successfully reserved inventory
- `inventory.reservation_failed` - Insufficient stock
- `inventory.released` - Reservation released
- `inventory.confirmed` - Reservation confirmed (stock deducted)
- `inventory.low_stock` - Stock below threshold

## Getting Started

### Prerequisites

- Go 1.22+
- PostgreSQL 15+
- RabbitMQ 3.12+
- Redis 7+ (optional)

### Installation

```bash
# Clone repository
cd apps/inventory

# Install dependencies
go mod download

# Copy environment file
cp .env.example .env

# Edit .env with your configuration
```

### Running Locally

```bash
# Run with Make
make run

# Or run directly
go run cmd/server/main.go
```

### Building

```bash
# Build binary
make build

# Run binary
./bin/inventory-service
```

### Docker

```bash
# Build image
make docker-build

# Run container
make docker-run
```

## Testing

```bash
# Run tests
make test

# Run with coverage
make test-coverage
```

## Usage Examples

### Create a Product

```bash
curl -X POST http://localhost:8082/api/v1/products \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Wireless Headphones",
    "description": "High-quality wireless headphones",
    "price": 129.99,
    "sku": "WH-001",
    "category": "Electronics"
  }'
```

### Reserve Stock

```bash
curl -X POST http://localhost:8082/api/v1/inventory/reserve \
  -H "Content-Type: application/json" \
  -d '{
    "productId": "550e8400-e29b-41d4-a716-446655440000",
    "orderId": "123e4567-e89b-12d3-a456-426614174000",
    "quantity": 2
  }'
```

### Check Stock Levels

```bash
curl http://localhost:8082/api/v1/inventory/550e8400-e29b-41d4-a716-446655440000/stock
```

Response:
```json
{
  "productId": "550e8400-e29b-41d4-a716-446655440000",
  "availableQuantity": 48,
  "reservedQuantity": 2,
  "totalQuantity": 50,
  "lowStockThreshold": 10,
  "isLowStock": false
}
```

## Configuration

Environment variables (see `.env.example`):

| Variable | Description | Default |
|----------|-------------|---------|
| PORT | Server port | 8082 |
| DB_HOST | PostgreSQL host | localhost |
| DB_NAME | Database name | inventory |
| RABBITMQ_URL | RabbitMQ connection URL | amqp://guest:guest@localhost:5672/ |

## Development

```bash
# Format code
make fmt

# Run linter
make lint

# Tidy dependencies
make tidy
```

## Troubleshooting

### Concurrency Conflicts

If you see "concurrency conflict" errors frequently, this indicates high contention on inventory updates. The service automatically retries up to 3 times with exponential backoff.

### Expired Reservations

Check logs for the background scheduler:
```
Checking for expired reservations...
Released 5 expired reservations
```

Reservations expire after 15 minutes if not confirmed.

## License

MIT
