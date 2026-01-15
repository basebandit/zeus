# Testing the Orders Service

## Local Development with Docker Compose

### Option 1: Run only infrastructure (for local development)

```bash
# Start PostgreSQL, Redis, and RabbitMQ
docker-compose -f docker-compose.yml up -d

# Install dependencies
npm install

# Run migrations
npm run migration:run

# Start in dev mode
npm run start:dev
```

### Option 2: Run everything with Docker

```bash
# Start all services including the app
docker-compose up -d

# View logs
docker-compose logs -f orders-service

# Check if migrations ran
docker-compose exec orders-service npm run migration:run
```

### Using the Makefile

```bash
# Install dependencies
make install

# Start infrastructure only
docker-compose -f docker-compose.dev.yml up -d

# Run migrations
make migration-run

# Start in dev mode
make dev

# Or start everything with Docker
make up

# View logs
make logs

# Access database
make db-shell

# Access Redis
make redis-cli

# Open RabbitMQ UI (http://localhost:15672)
# Username: guest, Password: guest
```

## API Testing

### 1. Health Check

```bash
curl http://localhost:8080/healthz
```

Expected response:
```json
{
  "status": "healthy",
  "service": "orders"
}
```

### 2. Add Item to Cart

```bash
curl -X POST http://localhost:8080/api/v1/cart/items \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "123e4567-e89b-12d3-a456-426614174000",
    "productId": "223e4567-e89b-12d3-a456-426614174001",
    "quantity": 2
  }'
```

### 3. Get Cart

```bash
curl "http://localhost:8080/api/v1/cart?userId=123e4567-e89b-12d3-a456-426614174000"
```

### 4. Create Order

```bash
curl -X POST http://localhost:8080/api/v1/orders \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "123e4567-e89b-12d3-a456-426614174000",
    "items": [
      {
        "productId": "223e4567-e89b-12d3-a456-426614174001",
        "quantity": 2
      }
    ],
    "shippingAddress": {
      "street": "123 Main St",
      "city": "San Francisco",
      "state": "CA",
      "zipCode": "94105",
      "country": "US"
    }
  }'
```

### 5. Get Order

```bash
curl http://localhost:8080/api/v1/orders/{orderId}
```

### 6. List User Orders

```bash
curl "http://localhost:8080/api/v1/orders?userId=123e4567-e89b-12d3-a456-426614174000&limit=10&offset=0"
```

### 7. Cancel Order

```bash
curl -X PUT http://localhost:8080/api/v1/orders/{orderId}/cancel
```

## Swagger Documentation

Visit http://localhost:8080/api/docs for interactive API documentation.

## Running Tests

```bash
# Unit tests
npm run test

# E2E tests
npm run test:e2e

# Test coverage
npm run test:cov

# Watch mode
npm run test:watch
```

## Database Operations

### Connect to PostgreSQL

```bash
# Using docker-compose
make db-shell

# Or directly
docker-compose exec postgres psql -U postgres -d basebandit_orders
```

### Useful SQL queries

```sql
-- View all orders
SELECT * FROM orders ORDER BY created_at DESC;

-- View order items
SELECT * FROM order_items WHERE order_id = 'your-order-id';

-- View order events
SELECT * FROM order_events WHERE order_id = 'your-order-id' ORDER BY created_at;

-- Count orders by status
SELECT status, COUNT(*) FROM orders GROUP BY status;
```

### Run migrations

```bash
# Generate migration from entity changes
npm run migration:generate -- src/migrations/MigrationName

# Run pending migrations
npm run migration:run

# Revert last migration
npm run migration:revert
```

## Redis Operations

```bash
# Connect to Redis
make redis-cli

# Check cart
GET cart:123e4567-e89b-12d3-a456-426614174000

# List all keys
KEYS *

# Clear all carts
KEYS cart:* | xargs redis-cli DEL
```

## RabbitMQ Operations

Access management UI: http://localhost:15672
- Username: guest
- Password: guest

### Check queues and exchanges

1. Go to "Queues" tab
2. Look for:
   - orders.payment_events
   - orders.inventory_events

3. Go to "Exchanges" tab
4. Look for: basebandit.events

### Publish test event

```bash
# You can publish events manually through the UI
# Or use the API to trigger events by creating orders
```

## Load Testing

### Using k6

```javascript
// load-test.js
import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  vus: 10,
  duration: '30s',
};

export default function () {
  const userId = '123e4567-e89b-12d3-a456-426614174000';
  const productId = '223e4567-e89b-12d3-a456-426614174001';

  // Add to cart
  const cartPayload = JSON.stringify({
    userId,
    productId,
    quantity: 1,
  });

  const cartRes = http.post('http://localhost:8080/api/v1/cart/items', cartPayload, {
    headers: { 'Content-Type': 'application/json' },
  });

  check(cartRes, { 'cart added': (r) => r.status === 200 || r.status === 201 });

  sleep(1);
}
```

Run with: `k6 run load-test.js`

## Troubleshooting

### Service won't start

1. Check if all dependencies are running:
```bash
docker-compose ps
```

2. Check logs:
```bash
make logs
```

3. Verify database connection:
```bash
docker-compose exec postgres pg_isready -U postgres
```

### Migrations failing

1. Check if database exists:
```bash
docker-compose exec postgres psql -U postgres -l
```

2. Run migrations manually:
```bash
docker-compose exec orders-service npm run migration:run
```

### Redis connection issues

```bash
docker-compose exec redis redis-cli ping
# Should return PONG
```

### RabbitMQ connection issues

```bash
docker-compose exec rabbitmq rabbitmq-diagnostics ping
# Should return "Ping succeeded"
```

## Cleanup

```bash
# Stop all services
make down

# Stop and remove volumes (clears all data)
make clean

# Rebuild everything
make rebuild
```
