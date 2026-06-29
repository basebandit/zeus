# Auth Service

User authentication for the Zeus e-commerce platform (Java 17 / Spring Boot 3). Issues HS256 JWTs
that the gateway validates with a shared secret, so other services never call this service on the
hot path. Publishes `user.registered` to the shared `basebandit.events` exchange.

## Endpoints

| Method | Path | Description |
|---|---|---|
| POST | `/api/v1/auth/register` | Create a user, returns access + refresh tokens (201) |
| POST | `/api/v1/auth/login` | Authenticate, returns tokens |
| POST | `/api/v1/auth/refresh` | Exchange a refresh token for new tokens |
| GET  | `/api/v1/auth/me` | Current user from the `Authorization: Bearer` access token |
| GET  | `/api/v1/auth/verify` | Validate a token; returns `X-User-Id`/`X-User-Role` headers (ForwardAuth-ready) |
| GET  | `/healthz` | Liveness |

## JWT

- Algorithm **HS256**, signed with `JWT_SECRET` (must be ≥ 32 bytes and identical to the gateway's).
- Access token claims: `sub` (userId), `email`, `role`, `iss`, `exp`.
- Refresh token adds `type=refresh`; default TTLs are 15 min (access) / 14 days (refresh).

## Configuration

See `.env.example`. DB on port 5435 locally; migrations run via Flyway (`db/migration/V1__users.sql`).

## Development

```bash
mvn test          # unit tests (JWT + service, no DB needed)
mvn spring-boot:run
docker compose up  # postgres + service (RabbitMQ expected on the host)
```

> Note: built with Maven targeting Java 17 (the project's polyglot "new language" is the JVM; the
> notifications service shares this stack). The edge currently validates tokens in the Go gateway —
> `/api/v1/auth/verify` exists so the edge can later move to Traefik ForwardAuth without code changes.
