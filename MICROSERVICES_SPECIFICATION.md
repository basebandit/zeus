# Basebandit Microservices Architecture Specification

## Executive Summary

This document outlines the architecture and implementation plan for a production-grade microservices platform for the Basebandit payment processing system. The platform demonstrates real-world distributed systems patterns including event-driven architecture, circuit breakers, retry mechanisms, message queues, and observability.

**Technology Stack**: Python (FastAPI), TypeScript (Node.js), Go, Java (Spring Boot)
**Infrastructure**: AWS EKS, ArgoCD (GitOps), Istio Service Mesh
**Observability**: Prometheus, Grafana, Thanos, Jaeger
**Message Queue**: RabbitMQ or Amazon SQS
**Databases**: PostgreSQL, Redis

---

## 1. System Architecture Overview

### 1.1 Microservices Portfolio

| Service | Language | Framework | Purpose | Status |
|---------|----------|-----------|---------|--------|
| **Payments Service** | Python | FastAPI | Payment processing orchestration, retry logic, idempotency | ✅ Deployed (v2.1.0) |
| **Orders Service** | TypeScript | Express/NestJS | Order management, shopping cart, order lifecycle | 🔄 To Build |
| **Inventory Service** | Go | Gin/Echo | Product catalog, stock management, reservation system | 🔄 To Build |
| **Notifications Service** | Java | Spring Boot | Email/SMS notifications, templating, delivery tracking | 🔄 To Build |
| **API Gateway** | TypeScript | Express + middleware | Rate limiting, authentication, request routing | 🔄 To Build |

### 1.2 Supporting Infrastructure

- **Message Queue**: RabbitMQ (for async communication between services)
- **Cache Layer**: Redis (for session management, rate limiting, caching)
- **Databases**:
  - PostgreSQL for each service (separate databases per service)
  - Connection pooling and read replicas for scaling
- **Service Mesh**: Istio (for traffic management, security, observability)
- **Observability Stack**:
  - Prometheus (metrics collection)
  - Grafana (visualization and dashboards)
  - Thanos (long-term metrics storage)
  - Jaeger (distributed tracing)
  - Loki (log aggregation)

---

## 2. Service Specifications

### 2.1 Payments Service (Python - FastAPI) ✅ EXISTING

**Current Status**: Basic health check endpoint deployed

**Enhanced Requirements**:

#### Core Features
- Payment processing with multiple providers (Stripe, PayPal simulation)
- Idempotency key handling (prevent duplicate charges)
- Exponential backoff retry mechanism
- Circuit breaker pattern for external API calls
- Payment state machine (pending → processing → completed/failed)
- Webhook handling for async payment confirmations
- Refund processing

#### API Endpoints
```
POST   /api/v1/payments                    # Initiate payment
GET    /api/v1/payments/{payment_id}       # Get payment status
POST   /api/v1/payments/{payment_id}/refund # Process refund
POST   /api/v1/webhooks/payment-provider   # Webhook receiver
GET    /healthz                             # Health check (existing)
GET    /metrics                             # Prometheus metrics
```

#### Database Schema
```sql
-- payments table
CREATE TABLE payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    currency VARCHAR(3) NOT NULL,
    status VARCHAR(20) NOT NULL, -- pending, processing, completed, failed, refunded
    provider VARCHAR(50) NOT NULL, -- stripe, paypal
    idempotency_key VARCHAR(255) UNIQUE NOT NULL,
    retry_count INT DEFAULT 0,
    last_error TEXT,
    metadata JSONB,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- payment_events table (event sourcing)
CREATE TABLE payment_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    payment_id UUID NOT NULL REFERENCES payments(id),
    event_type VARCHAR(50) NOT NULL,
    event_data JSONB,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_payments_order_id ON payments(order_id);
CREATE INDEX idx_payments_idempotency_key ON payments(idempotency_key);
CREATE INDEX idx_payment_events_payment_id ON payment_events(payment_id);
```

#### Message Queue Integration
- **Publishes**: `payment.completed`, `payment.failed`, `payment.refunded`
- **Consumes**: `order.created`, `payment.retry`

#### Resilience Patterns
- **Retry Logic**: Exponential backoff with jitter (1s, 2s, 4s, 8s, 16s max)
- **Circuit Breaker**: Tenacity or circuitbreaker library
- **Timeout**: 30s for payment provider calls
- **Rate Limiting**: 100 requests/minute per client

---

### 2.2 Orders Service (TypeScript - NestJS) 🆕

**Purpose**: Manage customer orders from cart to fulfillment

#### Core Features
- Shopping cart management (add/remove items)
- Order creation and validation
- Order state machine (cart → pending → confirmed → shipped → delivered → cancelled)
- Order history and tracking
- Integration with Inventory service (stock reservation)
- Integration with Payments service (payment processing)
- Saga pattern for distributed transactions

#### API Endpoints
```
POST   /api/v1/orders                      # Create order from cart
GET    /api/v1/orders/{order_id}           # Get order details
GET    /api/v1/orders                      # List user orders
PUT    /api/v1/orders/{order_id}/cancel    # Cancel order
GET    /api/v1/cart                        # Get shopping cart
POST   /api/v1/cart/items                  # Add item to cart
DELETE /api/v1/cart/items/{item_id}        # Remove item from cart
GET    /healthz                             # Health check
GET    /metrics                             # Prometheus metrics
```

#### Database Schema (PostgreSQL)
```sql
-- orders table
CREATE TABLE orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    total_amount DECIMAL(10,2) NOT NULL,
    currency VARCHAR(3) NOT NULL DEFAULT 'USD',
    status VARCHAR(20) NOT NULL, -- cart, pending, confirmed, shipped, delivered, cancelled
    payment_id UUID,
    shipping_address JSONB NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- order_items table
CREATE TABLE order_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    product_id UUID NOT NULL,
    quantity INT NOT NULL CHECK (quantity > 0),
    unit_price DECIMAL(10,2) NOT NULL,
    total_price DECIMAL(10,2) NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

-- order_events table (saga orchestration)
CREATE TABLE order_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL REFERENCES orders(id),
    event_type VARCHAR(50) NOT NULL,
    event_data JSONB,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_orders_user_id ON orders(user_id);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_order_items_order_id ON order_items(order_id);
```

#### Message Queue Integration
- **Publishes**: `order.created`, `order.confirmed`, `order.cancelled`, `order.shipped`
- **Consumes**: `payment.completed`, `payment.failed`, `inventory.reserved`, `inventory.reservation_failed`

#### Saga Pattern Implementation
```
Order Creation Saga:
1. Create Order (Pending)
2. Reserve Inventory → [Success: Continue | Failure: Cancel Order]
3. Process Payment → [Success: Confirm Order | Failure: Release Inventory, Cancel Order]
4. Send Notification
5. Mark Order as Confirmed

Compensating Transactions:
- If payment fails → Release inventory reservation
- If inventory unavailable → Cancel order, notify customer
```

#### Technology Stack
- **Framework**: NestJS (TypeScript)
- **Database**: TypeORM or Prisma
- **Validation**: class-validator
- **Message Queue**: amqplib (RabbitMQ client)
- **Caching**: ioredis
- **Testing**: Jest

---

### 2.3 Inventory Service (Go - Gin) 🆕

**Purpose**: Manage product catalog and stock levels with reservation system

#### Core Features
- Product CRUD operations
- Real-time stock tracking
- Stock reservation system with TTL (time-to-live)
- Automatic release of expired reservations
- Low stock alerts
- Product search and filtering
- Concurrent stock updates with optimistic locking

#### API Endpoints
```
GET    /api/v1/products                    # List products (with pagination)
GET    /api/v1/products/{product_id}       # Get product details
POST   /api/v1/products                    # Create product (admin)
PUT    /api/v1/products/{product_id}       # Update product (admin)
DELETE /api/v1/products/{product_id}       # Delete product (admin)
POST   /api/v1/inventory/reserve           # Reserve stock
POST   /api/v1/inventory/release           # Release reservation
POST   /api/v1/inventory/confirm           # Confirm reservation (deduct stock)
GET    /api/v1/inventory/{product_id}/stock # Get current stock
GET    /healthz                             # Health check
GET    /metrics                             # Prometheus metrics
```

#### Database Schema (PostgreSQL)
```sql
-- products table
CREATE TABLE products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    price DECIMAL(10,2) NOT NULL,
    currency VARCHAR(3) NOT NULL DEFAULT 'USD',
    sku VARCHAR(100) UNIQUE NOT NULL,
    category VARCHAR(100),
    image_url TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- inventory table
CREATE TABLE inventory (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    warehouse_location VARCHAR(100) NOT NULL DEFAULT 'MAIN',
    available_quantity INT NOT NULL DEFAULT 0 CHECK (available_quantity >= 0),
    reserved_quantity INT NOT NULL DEFAULT 0 CHECK (reserved_quantity >= 0),
    total_quantity INT GENERATED ALWAYS AS (available_quantity + reserved_quantity) STORED,
    version INT NOT NULL DEFAULT 1, -- for optimistic locking
    low_stock_threshold INT NOT NULL DEFAULT 10,
    updated_at TIMESTAMP DEFAULT NOW()
);

-- reservations table
CREATE TABLE reservations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID NOT NULL REFERENCES products(id),
    order_id UUID NOT NULL,
    quantity INT NOT NULL CHECK (quantity > 0),
    status VARCHAR(20) NOT NULL, -- active, confirmed, released, expired
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_products_sku ON products(sku);
CREATE INDEX idx_inventory_product_id ON inventory(product_id);
CREATE INDEX idx_reservations_order_id ON reservations(order_id);
CREATE INDEX idx_reservations_expires_at ON reservations(expires_at) WHERE status = 'active';
```

#### Reservation System Logic
- **Reservation TTL**: 15 minutes (configurable)
- **Background Job**: Every 1 minute, release expired reservations
- **Optimistic Locking**: Use version field to prevent race conditions
- **Transaction Isolation**: `SERIALIZABLE` for critical stock updates

#### Message Queue Integration
- **Publishes**: `inventory.reserved`, `inventory.reservation_failed`, `inventory.confirmed`, `inventory.released`, `inventory.low_stock`
- **Consumes**: `order.created`, `order.cancelled`, `payment.failed`

#### Technology Stack
- **Framework**: Gin or Echo
- **Database**: GORM or sqlx
- **Validation**: go-playground/validator
- **Message Queue**: streadway/amqp (RabbitMQ)
- **Cache**: go-redis
- **Background Jobs**: robfig/cron
- **Testing**: testify

#### Optimistic Locking Example (Go)
```go
func (s *InventoryService) ReserveStock(productID uuid.UUID, quantity int) error {
    for retries := 0; retries < 3; retries++ {
        tx := s.db.Begin()

        var inv Inventory
        tx.Where("product_id = ?", productID).First(&inv)

        if inv.AvailableQuantity < quantity {
            tx.Rollback()
            return ErrInsufficientStock
        }

        result := tx.Model(&inv).
            Where("version = ?", inv.Version).
            Updates(map[string]interface{}{
                "available_quantity": inv.AvailableQuantity - quantity,
                "reserved_quantity": inv.ReservedQuantity + quantity,
                "version": inv.Version + 1,
            })

        if result.RowsAffected == 0 {
            tx.Rollback()
            continue // retry on version conflict
        }

        tx.Commit()
        return nil
    }
    return ErrConcurrencyConflict
}
```

---

### 2.4 Notifications Service (Java - Spring Boot) 🆕

**Purpose**: Send transactional notifications (email, SMS) with delivery tracking

#### Core Features
- Multi-channel notifications (email, SMS, push)
- Template management (Thymeleaf, Mustache)
- Async processing with retry queue
- Delivery status tracking
- Rate limiting per channel
- Dead letter queue for failed notifications
- Integration with SendGrid (email), Twilio (SMS)

#### API Endpoints
```
POST   /api/v1/notifications/send          # Send notification
GET    /api/v1/notifications/{id}          # Get notification status
GET    /api/v1/notifications                # List notifications (with filters)
POST   /api/v1/templates                    # Create template (admin)
GET    /api/v1/templates                    # List templates
GET    /api/v1/templates/{id}               # Get template
PUT    /api/v1/templates/{id}               # Update template
GET    /healthz                             # Health check
GET    /actuator/prometheus                 # Prometheus metrics
```

#### Database Schema (PostgreSQL)
```sql
-- notifications table
CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    channel VARCHAR(20) NOT NULL, -- email, sms, push
    recipient VARCHAR(255) NOT NULL,
    subject VARCHAR(255),
    template_id UUID,
    template_data JSONB,
    status VARCHAR(20) NOT NULL, -- pending, sent, failed, delivered, bounced
    retry_count INT DEFAULT 0,
    last_error TEXT,
    sent_at TIMESTAMP,
    delivered_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- templates table
CREATE TABLE templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) UNIQUE NOT NULL,
    channel VARCHAR(20) NOT NULL,
    subject VARCHAR(255),
    body TEXT NOT NULL,
    variables JSONB, -- list of required variables
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_notifications_status ON notifications(status);
CREATE INDEX idx_templates_name ON templates(name);
```

#### Message Queue Integration
- **Consumes**: `order.confirmed`, `payment.completed`, `payment.failed`, `order.shipped`, `inventory.low_stock`
- **Publishes**: `notification.sent`, `notification.failed`

#### Notification Templates
```
Templates to Create:
1. order_confirmation (email) - "Your order #{{orderId}} has been confirmed"
2. payment_success (email, sms) - "Payment of {{amount}} received"
3. payment_failed (email, sms) - "Payment failed, please retry"
4. order_shipped (email, sms) - "Your order has shipped: {{trackingNumber}}"
5. low_stock_alert (email) - "Product {{productName}} is low on stock"
```

#### Technology Stack
- **Framework**: Spring Boot 3.x
- **Database**: Spring Data JPA + PostgreSQL
- **Message Queue**: Spring AMQP (RabbitMQ)
- **Template Engine**: Thymeleaf
- **Email**: SendGrid Java SDK
- **SMS**: Twilio Java SDK
- **Async Processing**: @Async with ThreadPoolTaskExecutor
- **Retry**: Spring Retry with exponential backoff
- **Testing**: JUnit 5, Mockito, Testcontainers

---

### 2.5 API Gateway (TypeScript - Express) 🆕

**Purpose**: Single entry point for all client requests with cross-cutting concerns

#### Core Features
- Request routing to downstream services
- JWT authentication and authorization
- Rate limiting (per user, per IP)
- Request/response logging
- CORS handling
- API versioning
- Request validation
- Service discovery integration
- Circuit breaker for downstream services

#### API Endpoints
```
All routes are proxied to backend services:

POST   /api/v1/auth/login                  # Authentication
POST   /api/v1/auth/register               # User registration

/api/v1/orders/*      → Orders Service
/api/v1/payments/*    → Payments Service
/api/v1/products/*    → Inventory Service
/api/v1/inventory/*   → Inventory Service
/api/v1/notifications/* → Notifications Service

GET    /healthz                             # Health check
GET    /metrics                             # Prometheus metrics
```

#### Technology Stack
- **Framework**: Express.js with TypeScript
- **Authentication**: jsonwebtoken, passport
- **Rate Limiting**: express-rate-limit + Redis
- **Proxy**: http-proxy-middleware
- **Validation**: joi or zod
- **Circuit Breaker**: opossum
- **Logging**: winston + morgan
- **Testing**: Jest, supertest

#### Middleware Stack
```typescript
1. Helmet (security headers)
2. CORS
3. Request logging (morgan)
4. Rate limiting (express-rate-limit)
5. JWT authentication (passport)
6. Request validation
7. Circuit breaker (per service)
8. Proxy routing
9. Error handling
10. Metrics collection
```

---

## 3. Cross-Cutting Concerns

### 3.1 Message Queue Architecture (RabbitMQ)

#### Exchange Configuration
```
Exchange: basebandit.events (topic exchange)

Routing Keys:
- order.created
- order.confirmed
- order.cancelled
- order.shipped
- payment.completed
- payment.failed
- payment.refunded
- inventory.reserved
- inventory.reservation_failed
- inventory.released
- inventory.confirmed
- inventory.low_stock
- notification.sent
- notification.failed
```

#### Queue Bindings
```
Payments Service:
  Queue: payments.events
  Bindings: order.created, payment.retry

Orders Service:
  Queue: orders.events
  Bindings: payment.completed, payment.failed, inventory.reserved, inventory.reservation_failed

Inventory Service:
  Queue: inventory.events
  Bindings: order.created, order.cancelled, payment.failed

Notifications Service:
  Queue: notifications.events
  Bindings: order.confirmed, payment.completed, payment.failed, order.shipped, inventory.low_stock
```

#### Dead Letter Queues
- Each service has a DLQ for failed message processing
- Messages retry 3 times before moving to DLQ
- DLQ retention: 7 days for manual investigation

---

### 3.2 Database Strategy

#### Per-Service Databases
- **Payments DB**: `basebandit_payments`
- **Orders DB**: `basebandit_orders`
- **Inventory DB**: `basebandit_inventory`
- **Notifications DB**: `basebandit_notifications`

#### Connection Pooling
- **Max connections**: 20 per service
- **Idle timeout**: 10 minutes
- **Connection timeout**: 30 seconds

#### Backup & Recovery
- Daily automated backups
- Point-in-time recovery enabled
- 30-day retention

---

### 3.3 Redis Caching Strategy

#### Use Cases
```
API Gateway:
- Rate limiting counters (key: rate_limit:{user_id}, TTL: 60s)
- Session storage (key: session:{session_id}, TTL: 24h)

Orders Service:
- Shopping cart (key: cart:{user_id}, TTL: 7d)
- Recent orders cache (key: orders:{user_id}, TTL: 1h)

Inventory Service:
- Product cache (key: product:{product_id}, TTL: 1h)
- Stock levels (key: stock:{product_id}, TTL: 5m)

Payments Service:
- Idempotency cache (key: idempotency:{key}, TTL: 24h)
```

---

### 3.4 Observability Standards

#### Metrics (Prometheus)

**RED Metrics** (for all services):
- **Rate**: Requests per second
- **Errors**: Error rate (%)
- **Duration**: Request latency (p50, p95, p99)

**Custom Business Metrics**:
```
Payments:
- payment_total_amount_usd (counter)
- payment_processing_duration_seconds (histogram)
- payment_retry_count (counter)
- payment_failure_rate (gauge)

Orders:
- orders_created_total (counter)
- orders_cancelled_total (counter)
- cart_abandonment_rate (gauge)
- average_order_value_usd (gauge)

Inventory:
- products_out_of_stock (gauge)
- reservations_expired_total (counter)
- inventory_updates_total (counter)

Notifications:
- notifications_sent_total (counter by channel)
- notification_delivery_duration_seconds (histogram)
- notification_failure_rate (gauge by channel)
```

#### Distributed Tracing (Jaeger)
- Trace ID propagation via HTTP headers (`X-Request-ID`, `X-B3-TraceId`)
- Span naming convention: `{service}.{operation}`
- Sample rate: 100% in staging, 10% in production

#### Logging Standards (Structured JSON)
```json
{
  "timestamp": "2026-01-14T10:30:00Z",
  "level": "info",
  "service": "payments",
  "trace_id": "abc123",
  "span_id": "def456",
  "message": "Payment processed successfully",
  "payment_id": "pay_789",
  "amount": 99.99,
  "currency": "USD",
  "duration_ms": 234
}
```

---

## 4. Istio Service Mesh Integration

### 4.1 Traffic Management

#### Virtual Services
- Canary deployments (90/10 traffic split)
- Blue-green deployments
- Request routing based on headers
- Timeout configuration (30s default)
- Retry policy (3 attempts with exponential backoff)

#### Destination Rules
- Circuit breaker: 100 concurrent connections, 10 consecutive errors
- Connection pool: 1024 HTTP1, 100 HTTP2
- Load balancing: Round robin with consistent hash for sticky sessions

### 4.2 Security

#### mTLS Configuration
- Mode: `STRICT` for service-to-service communication
- Certificate rotation: 24 hours
- Certificate authority: Istio CA (Citadel)

#### Authorization Policies
- Deny by default
- Explicit allow rules per service
- Service account-based identity

### 4.3 Sidecar Injection
- Automatic injection via namespace label: `istio-injection=enabled`
- Resource limits: 200m CPU, 256Mi memory per sidecar
- Exclude health check endpoints from mTLS

---

## 5. Deployment Strategy

### 5.1 Kubernetes Resources per Service

```yaml
Resources:
- Namespace: {service-name}
- Deployment: {service-name}
  - Replicas: 2 (staging), 3+ (production)
  - Rolling update: maxUnavailable=1, maxSurge=1
- Service: ClusterIP
- ServiceAccount: {service-name}-sa
- ConfigMap: {service-name}-config
- Secret: {service-name}-secrets (via External Secrets Operator)
- HorizontalPodAutoscaler:
  - Min: 2, Max: 10
  - Target CPU: 70%
  - Target Memory: 80%
- PodDisruptionBudget: minAvailable=1
```

### 5.2 ArgoCD Application Pattern

Each service follows the same pattern as the existing payments service:

```yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: staging-{service-name}
  namespace: argocd
spec:
  project: staging-{domain}-apps
  source:
    repoURL: <your-git-repo>
    targetRevision: main
    path: charts/{service-name}
    helm:
      valueFiles:
        - staging-values.yaml
  destination:
    server: https://kubernetes.default.svc
    namespace: {service-name}
  syncPolicy:
    automated:
      prune: true
      selfHeal: true
    syncOptions:
      - CreateNamespace=true
    retry:
      limit: 5
      backoff:
        duration: 5s
        factor: 2
        maxDuration: 3m
```

### 5.3 Image Update Strategy

ArgoCD Image Updater annotations for automated deployments:

```yaml
annotations:
  argocd-image-updater.argoproj.io/image-list: {service}={ecr-registry}/{service}
  argocd-image-updater.argoproj.io/{service}.update-strategy: semver
  argocd-image-updater.argoproj.io/write-back-method: git:secret:argocd/zeus-repo
```

---

## 6. Implementation Phases

### Phase 1: Core Services Development (Week 1-2)
1. ✅ Payments Service (basic) - **DONE**
2. 🔄 Enhance Payments Service with retry logic, circuit breaker, database
3. 🔄 Orders Service implementation
4. 🔄 Inventory Service implementation
5. 🔄 Notifications Service implementation
6. 🔄 API Gateway implementation

### Phase 2: Infrastructure Setup (Week 2-3)
1. 🔄 Deploy PostgreSQL via Helm (or RDS)
2. 🔄 Deploy Redis via Helm (or ElastiCache)
3. 🔄 Deploy RabbitMQ via Helm (or Amazon MQ)
4. 🔄 Create ArgoCD applications for each service
5. 🔄 Setup External Secrets for database credentials

### Phase 3: Service Mesh Integration (Week 3-4)
1. 🔄 Install Istio on EKS cluster
2. 🔄 Enable sidecar injection for all service namespaces
3. 🔄 Configure Virtual Services and Destination Rules
4. 🔄 Setup mTLS for service-to-service communication
5. 🔄 Configure circuit breakers and retry policies

### Phase 4: Observability Stack (Week 4-5)
1. 🔄 Deploy Prometheus via kube-prometheus-stack
2. 🔄 Deploy Grafana with custom dashboards
3. 🔄 Deploy Thanos for long-term metrics storage
4. 🔄 Deploy Jaeger for distributed tracing
5. 🔄 Deploy Loki for log aggregation
6. 🔄 Integrate Istio metrics with Prometheus

### Phase 5: Testing & Validation (Week 5-6)
1. 🔄 Integration testing between services
2. 🔄 Load testing with k6 or Locust
3. 🔄 Chaos engineering with Chaos Mesh
4. 🔄 Security testing (OWASP ZAP)
5. 🔄 Performance tuning

---

## 7. Testing Strategy

### 7.1 Unit Testing
- **Coverage Target**: 80% minimum
- **Tools**: Pytest (Python), Jest (TypeScript), Go testing (Go), JUnit (Java)
- **Mocking**: Mock external dependencies (database, message queue, HTTP clients)

### 7.2 Integration Testing
- **Scope**: Service-to-service communication
- **Tools**: Testcontainers for database/RabbitMQ, Docker Compose for local testing
- **Scenarios**:
  - Order creation saga (happy path)
  - Payment failure with inventory rollback
  - Concurrent stock reservation conflicts

### 7.3 Load Testing
- **Tool**: k6 or Locust
- **Targets**:
  - 100 requests/second per service
  - p99 latency < 500ms
  - Error rate < 0.1%

### 7.4 Chaos Testing
- **Tool**: Chaos Mesh or Litmus
- **Experiments**:
  - Pod failure during payment processing
  - Network latency between services
  - Database connection pool exhaustion
  - Message queue unavailability

---

## 8. Security Considerations

### 8.1 Application Security
- **Input Validation**: All API inputs validated
- **SQL Injection**: Parameterized queries only (ORM usage)
- **XSS Prevention**: Output encoding in templates
- **CSRF Protection**: CSRF tokens for state-changing operations
- **Rate Limiting**: Per-user and per-IP limits

### 8.2 Infrastructure Security
- **Network Policies**: Restrict pod-to-pod communication
- **Pod Security Standards**: Enforce restricted or baseline standards
- **Secret Management**: External Secrets Operator with AWS Secrets Manager
- **Image Scanning**: Trivy or Clair in CI/CD pipeline
- **RBAC**: Least privilege for service accounts

### 8.3 Compliance
- **PCI DSS**: For payment processing (tokenization, no raw card storage)
- **GDPR**: For user data (data retention, right to deletion)
- **Audit Logging**: All critical operations logged

---

## 9. Monitoring & Alerts

### 9.1 Critical Alerts

```yaml
Payment Service:
- Payment failure rate > 5% (5m window)
- Payment processing time > 10s (p95)
- Database connection pool exhausted

Orders Service:
- Order creation failure rate > 2%
- Saga compensation rate > 5%
- Cart abandonment rate > 70%

Inventory Service:
- Concurrent stock update conflicts > 10/min
- Reservation expiry rate > 20%
- Products out of stock > 10

Notifications Service:
- Email delivery failure rate > 10%
- SMS delivery failure rate > 5%
- Notification queue depth > 1000

Infrastructure:
- Pod crash loop
- Node memory > 90%
- Node CPU > 85%
- Persistent volume > 85% full
```

### 9.2 Grafana Dashboards

```
Dashboards to Create:
1. Service Overview (RED metrics for all services)
2. Business Metrics (orders, revenue, conversion rates)
3. Kubernetes Cluster Health
4. Istio Service Mesh Metrics
5. Database Performance
6. Message Queue Health
7. Cost Analysis (resource usage)
```

---

## 10. Cost Optimization

### 10.1 Resource Limits
```yaml
Small Services (API Gateway, Notifications):
  requests: 100m CPU, 128Mi memory
  limits: 200m CPU, 256Mi memory

Medium Services (Payments, Orders):
  requests: 200m CPU, 256Mi memory
  limits: 500m CPU, 512Mi memory

Large Services (Inventory):
  requests: 300m CPU, 512Mi memory
  limits: 1000m CPU, 1Gi memory
```

### 10.2 Autoscaling Strategy
- **HPA**: Based on CPU/memory and custom metrics (queue depth)
- **VPA**: For right-sizing recommendations
- **Cluster Autoscaler**: For node scaling
- **Karpenter**: For spot instance optimization (optional)

### 10.3 Storage Optimization
- **Database**: gp3 volumes with provisioned IOPS
- **Persistent Volumes**: Use gp3 instead of gp2
- **Log Retention**: 7 days in Loki, 30 days in S3
- **Metrics Retention**: 15 days in Prometheus, 90 days in Thanos

---

## 11. Documentation Requirements

### 11.1 Per-Service Documentation
- README.md (setup, dependencies, running locally)
- API.md (OpenAPI/Swagger specification)
- ARCHITECTURE.md (design decisions, data models)
- RUNBOOK.md (troubleshooting, common issues)

### 11.2 Architecture Documentation
- System architecture diagram
- Database schema diagram
- Message flow diagram
- Deployment architecture
- Disaster recovery plan

---

## 12. Success Metrics

### 12.1 Technical Metrics
- **Availability**: 99.9% uptime per service
- **Latency**: p99 < 500ms for API calls
- **Throughput**: 100 RPS per service minimum
- **Error Rate**: < 0.1%
- **MTTR**: < 30 minutes

### 12.2 Business Metrics
- **Order Completion Rate**: > 95%
- **Payment Success Rate**: > 98%
- **Cart Abandonment**: < 70%
- **Customer Notification Delivery**: > 99%

---

## 13. Next Steps

1. **Review this specification** and provide feedback
2. **Prioritize services** to build first (recommend: Orders → Inventory → Notifications → API Gateway)
3. **Start with Orders Service** (TypeScript/NestJS)
4. **Set up infrastructure dependencies** (PostgreSQL, Redis, RabbitMQ)
5. **Implement service-by-service** with full testing
6. **Deploy to EKS** via ArgoCD
7. **Add Istio** once all services are running
8. **Configure observability** stack
9. **Load test** and optimize
10. **Document and iterate**

---

## Appendix A: Technology Justification

### Why NestJS for Orders Service?
- Built-in dependency injection
- Native TypeScript support
- Excellent microservices patterns (CQRS, Saga)
- Strong community and documentation

### Why Go for Inventory Service?
- Excellent concurrency primitives (goroutines)
- Fast performance for high-throughput operations
- Strong typing and compile-time safety
- Low memory footprint

### Why Spring Boot for Notifications Service?
- Mature ecosystem for enterprise applications
- Excellent async processing support
- Strong integration with email/SMS providers
- Robust retry and error handling libraries

### Why RabbitMQ over Kafka?
- Simpler operational model for small-medium scale
- Excellent routing flexibility with topic exchanges
- Lower resource requirements
- Mature Helm charts available

---

**Document Version**: 1.0
**Last Updated**: 2026-01-14
**Author**: Claude Code
**Status**: Draft for Review
