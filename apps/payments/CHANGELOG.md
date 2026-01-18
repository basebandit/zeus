## v3.0.0 (2026-01-18)

### Feat

- update root gitignore for all services
- **orders**: add npm package lock file
- **orders**: add API testing script
- **orders**: add build and utility scripts
- **orders**: add environment and Docker ignore configuration
- **orders**: add Docker and build configuration
- **orders**: add TypeScript and code quality configuration
- **orders**: add database migrations
- **orders**: implement orders service core functionality
- **orders**: update event service configuration
- **inventory**: add test scripts
- **inventory**: add environment and Docker ignore configuration
- **inventory**: add Docker and build configuration
- **inventory**: add database migrations
- **inventory**: add RabbitMQ event publisher
- **inventory**: implement core service logic
- **inventory**: add service entry point
- **inventory**: add Go module dependencies
- **payments**: add Makefile and environment configuration
- **payments**: add Docker configuration for deployment
- **payments**: add database migrations with Alembic
- **payments**: add FastAPI application with lifespan management
- **payments**: implement payment service with event-driven architecture
- **payments**: add payment service dependencies
- **inventory**: populate userId and totalAmount in reserved event
- **inventory**: add userId and totalAmount to inventory.reserved event
- **orders**: integrate event module into app module
- **orders**: add event module to wire up consumers on startup
- **orders**: implement RabbitMQ consumers with DLQ and retry logic
- **orders**: add event handlers for payment and inventory events
- **orders**: add event DTOs for Saga pattern
- enable HA mode for ArgoCD
- add replica count for controller
- implement ArgoCD bootstrap with External Secrets integration

### Fix

- unstage wrongly commited files
- use Literal type for PaymentStatus in Pydantic schemas
- remove unnecessary str casts in payment service
- resolve mypy type errors in event consumer
- relax mypy config and fix type issues for production setup
- add type annotations to resolve mypy errors
- remove unused imports and fix f-string warnings in payments
- update payment tests to use mocking instead of database
- **tests**: correct test mocks and assertions to match implementation
- **orders**: correct OrderItem to Order relationship and add JoinColumn
- ignore CRD annotations to prevent size limit errors (#34)
- add RespectIgnoreDifferences to resolve sync issues (#33)
- enable ServerSideApply to resolve annotation size limit (#32)
- add chart parameter to external-secrets source (#31)
- correct project name reference for external-secrets
- correct typo in sources

### Refactor

- **format**: run linter to format file
- migrate to SQLAlchemy 2.0 mapped_column for better type safety
- use NestJS Logger mocking instead of global console suppression

## v2.1.0 (2025-08-18)

### Feat

- **ci**: add docker build and push step
- **ci**: add gha workflow and commit pre-hook for payments app
- **terraform**: create iam role and pod identity association for use as eso provider
- **argocd**: configure and bootstrap argocd porject and application sets for staging environment
- **apps**: add payments monrepo directory
- **argocd**: add payments app of apps project to manage payments applications
- **helm**: create payments chart for staging deployment
- **argocd**: create application resources for our payments application deployment
- **argocd**: add argocd server bootstrapping configuration
- **argocd**: add argocd bootstrapping config
- **argocd**: provision resources for bootstrapping argocd

### Fix

- **python**: remove unused import
- **argocd**: add missing property field
- **argocd**: update ExternalSecrets to use ClusterSecretStore
- **argocd-server**: update apiVersion
- **argocd-server**: update apiVersion
- **argocd**: fix repo url typo
- **dockerfile**: generate .venv directory in the image
- **python**: install fastapi
- **argocd**: add missing chart name

## v2.0.0 (2025-07-26)

### Feat

- **terraform**: provision eks resources

## v1.0.0 (2025-07-25)

### Feat

- **terraform**: vpc resources to be provisioned
