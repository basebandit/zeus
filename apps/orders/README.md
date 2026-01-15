# Orders Service

Order and shopping cart management service built with NestJS and TypeScript.

## Features

- Shopping cart management (add/remove items)
- Order creation and lifecycle management
- Order state machine (cart → pending → confirmed → shipped → delivered)
- Event-driven architecture with RabbitMQ
- Redis caching for cart data
- PostgreSQL database with TypeORM
- RESTful API with Swagger documentation
- Saga pattern for distributed transactions

## Tech Stack

- **Framework**: NestJS
- **Language**: TypeScript
- **Database**: PostgreSQL with TypeORM
- **Cache**: Redis (ioredis)
- **Message Queue**: RabbitMQ
- **Validation**: class-validator
- **Documentation**: Swagger/OpenAPI

## Prerequisites

- Node.js 20+
- PostgreSQL 14+
- Redis 7+
- RabbitMQ 3.12+

## Installation

```bash
npm install
```

## Configuration

Copy `.env.example` to `.env` and configure:

```bash
cp .env.example .env
```

## Database Setup

Run migrations:

```bash
npm run migration:run
```

## Running the Application

### Local Development (with hot-reload)

```bash
# Start infrastructure only (PostgreSQL, Redis, RabbitMQ)
docker-compose up -d

# OR using make
make up

# Install dependencies
npm install

# Run migrations
npm run migration:run

# Start in dev mode with hot-reload
npm run start:dev
```

### Full Docker Deployment

```bash
# Start everything including the app
docker-compose --profile app up -d

# OR using make
make up-all

# View logs
make logs-orders
```

### Production

```bash
npm run build
npm run start:prod
```

## API Documentation

Once running, visit: http://localhost:8080/api/docs

## API Endpoints

### Cart Management
- `GET /api/v1/cart?userId={userId}` - Get shopping cart
- `POST /api/v1/cart/items` - Add item to cart
- `DELETE /api/v1/cart/items/{itemId}?userId={userId}` - Remove item

### Orders
- `POST /api/v1/orders` - Create order
- `GET /api/v1/orders/{orderId}` - Get order details
- `GET /api/v1/orders?userId={userId}` - List user orders
- `PUT /api/v1/orders/{orderId}/cancel` - Cancel order

### Health
- `GET /healthz` - Health check

## Event Flow

### Order Creation Saga
1. User creates order → `order.created` event published
2. Inventory service reserves stock → `inventory.reserved` or `inventory.reservation_failed`
3. Payment service processes payment → `payment.completed` or `payment.failed`
4. Order confirmed → `order.confirmed` event published
5. Notification sent to user

### Compensating Transactions
- If payment fails → Release inventory, cancel order
- If inventory unavailable → Cancel order, notify user

## Testing

```bash
# Unit tests
npm run test

# E2E tests
npm run test:e2e

# Test coverage
npm run test:cov
```

## Docker

Build image:
```bash
docker build -t orders-service:latest .
```

Run container:
```bash
docker run -p 8080:8080 --env-file .env orders-service:latest
```

## Project Structure

```
src/
├── config/           # Configuration files
├── controllers/      # REST API controllers
├── dto/             # Data transfer objects
├── entities/        # TypeORM entities
├── migrations/      # Database migrations
├── modules/         # NestJS modules
├── services/        # Business logic services
├── app.module.ts    # Root module
└── main.ts          # Application entry point
```
