# Changelog

All notable changes to the Orders Service will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.0] - 2026-01-14

### Added
- Initial release of Orders Service
- Shopping cart management (add/remove items)
- Order creation and lifecycle management
- Order state machine (cart → pending → confirmed → shipped → delivered → cancelled)
- Integration with PostgreSQL for data persistence
- Integration with Redis for cart caching
- Integration with RabbitMQ for event-driven communication
- RESTful API with Swagger documentation
- Health check endpoint
- Docker support with multi-stage build
- Kubernetes Helm chart
- Database migrations with TypeORM
- Comprehensive error handling and validation
- Event sourcing for order events
- Saga pattern for distributed transactions

### Features
- POST /api/v1/orders - Create order
- GET /api/v1/orders/:id - Get order details
- GET /api/v1/orders - List user orders
- PUT /api/v1/orders/:id/cancel - Cancel order
- GET /api/v1/cart - Get shopping cart
- POST /api/v1/cart/items - Add item to cart
- DELETE /api/v1/cart/items/:id - Remove item from cart
- GET /healthz - Health check

### Technical Details
- Built with NestJS and TypeScript
- PostgreSQL database with proper indexes
- Redis caching for performance
- RabbitMQ for async messaging
- Full test coverage
- Linting and formatting with ESLint and Prettier
- Security best practices (non-root container, read-only filesystem)
