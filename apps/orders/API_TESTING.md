# API Testing Guide

## Quick Test Script

Run the comprehensive test suite:

```bash
./test-api.sh
```

With custom base URL:
```bash
BASE_URL=http://localhost:8080 ./test-api.sh
```

---

## Manual cURL Commands

### 1. Health Check

```bash
curl http://localhost:8080/healthz
```

**Expected Response:**
```json
{
  "status": "healthy",
  "service": "orders"
}
```

---

### 2. Add Item to Cart

```bash
curl -X POST http://localhost:8080/api/v1/cart/items \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "123e4567-e89b-12d3-a456-426614174000",
    "productId": "550e8400-e29b-41d4-a716-446655440000",
    "quantity": 2
  }'
```

**Expected Response:**
```json
{
  "id": "...",
  "userId": "123e4567-e89b-12d3-a456-426614174000",
  "status": "cart",
  "totalAmount": 59.98,
  "currency": "USD",
  "items": [
    {
      "id": "...",
      "productId": "550e8400-e29b-41d4-a716-446655440000",
      "quantity": 2,
      "unitPrice": 29.99,
      "totalPrice": 59.98
    }
  ]
}
```

---

### 3. Get Shopping Cart

```bash
curl "http://localhost:8080/api/v1/cart?userId=123e4567-e89b-12d3-a456-426614174000"
```

---

### 4. Remove Item from Cart

```bash
curl -X DELETE "http://localhost:8080/api/v1/cart/items/{ITEM_ID}?userId=123e4567-e89b-12d3-a456-426614174000"
```

---

### 5. Create Order

```bash
curl -X POST http://localhost:8080/api/v1/orders \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "123e4567-e89b-12d3-a456-426614174000",
    "items": [
      {
        "productId": "550e8400-e29b-41d4-a716-446655440000",
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

**Expected Response:**
```json
{
  "id": "...",
  "userId": "123e4567-e89b-12d3-a456-426614174000",
  "totalAmount": 59.98,
  "currency": "USD",
  "status": "pending",
  "paymentId": null,
  "shippingAddress": {
    "street": "123 Main St",
    "city": "San Francisco",
    "state": "CA",
    "zipCode": "94105",
    "country": "US"
  },
  "items": [...],
  "createdAt": "2026-01-14T...",
  "updatedAt": "2026-01-14T..."
}
```

---

### 6. Get Order Details

```bash
curl http://localhost:8080/api/v1/orders/{ORDER_ID}
```

---

### 7. List User Orders

```bash
curl "http://localhost:8080/api/v1/orders?userId=123e4567-e89b-12d3-a456-426614174000&limit=10&offset=0"
```

**Expected Response:**
```json
{
  "data": [...],
  "total": 5,
  "limit": 10,
  "offset": 0
}
```

---

### 8. Cancel Order

```bash
curl -X PUT http://localhost:8080/api/v1/orders/{ORDER_ID}/cancel
```

---

## Production-Grade Testing Patterns

### Using jq for JSON Processing

Pretty print response:
```bash
curl -s http://localhost:8080/api/v1/cart?userId=... | jq '.'
```

Extract specific field:
```bash
ORDER_ID=$(curl -s -X POST http://localhost:8080/api/v1/orders ... | jq -r '.id')
```

### Error Handling Tests

**Invalid UUID:**
```bash
curl -X POST http://localhost:8080/api/v1/cart/items \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "invalid-uuid",
    "productId": "550e8400-e29b-41d4-a716-446655440000",
    "quantity": 1
  }'
```

**Invalid Quantity (< 1):**
```bash
curl -X POST http://localhost:8080/api/v1/cart/items \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "123e4567-e89b-12d3-a456-426614174000",
    "productId": "550e8400-e29b-41d4-a716-446655440000",
    "quantity": 0
  }'
```

**Missing Required Field:**
```bash
curl -X POST http://localhost:8080/api/v1/orders \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "123e4567-e89b-12d3-a456-426614174000",
    "items": []
  }'
```

---

## Load Testing with Apache Bench

```bash
# Test health endpoint
ab -n 1000 -c 10 http://localhost:8080/healthz

# Test cart endpoint (with POST data)
ab -n 100 -c 5 -p cart-payload.json -T application/json \
  http://localhost:8080/api/v1/cart/items
```

---

## Integration with CI/CD

### Newman (Postman CLI)

Export Postman collection and run:
```bash
newman run orders-api-collection.json -e staging.json
```

### k6 Load Test

```javascript
// load-test.js
import http from 'k6/http';
import { check } from 'k6';

export const options = {
  vus: 10,
  duration: '30s',
};

export default function () {
  const payload = JSON.stringify({
    userId: '123e4567-e89b-12d3-a456-426614174000',
    productId: '550e8400-e29b-41d4-a716-446655440000',
    quantity: 1,
  });

  const res = http.post('http://localhost:8080/api/v1/cart/items', payload, {
    headers: { 'Content-Type': 'application/json' },
  });

  check(res, {
    'status is 200 or 201': (r) => r.status === 200 || r.status === 201,
  });
}
```

Run: `k6 run load-test.js`

---

## Monitoring & Debugging

### Watch logs while testing

```bash
# Terminal 1: Run tests
./test-api.sh

# Terminal 2: Watch logs
make logs-orders

# Or for infrastructure logs
make logs
```

### Check database state

```bash
make db-shell

# In psql:
SELECT * FROM orders ORDER BY created_at DESC LIMIT 5;
SELECT * FROM order_items WHERE order_id = 'your-order-id';
SELECT * FROM order_events WHERE order_id = 'your-order-id';
```

### Check Redis cache

```bash
make redis-cli

# In redis-cli:
KEYS cart:*
GET cart:123e4567-e89b-12d3-a456-426614174000
```

---

## Common Test UUIDs

Use these consistent UUIDs for testing:

```bash
USER_ID_1="123e4567-e89b-12d3-a456-426614174000"
USER_ID_2="123e4567-e89b-12d3-a456-426614174001"
PRODUCT_ID_1="550e8400-e29b-41d4-a716-446655440000"
PRODUCT_ID_2="660e8400-e29b-41d4-a716-446655440001"
PRODUCT_ID_3="770e8400-e29b-41d4-a716-446655440002"
```
