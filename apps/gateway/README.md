# Gateway Service

The API gateway is the single public entry point for the Zeus e-commerce backend. It authenticates
requests, forwards the caller's identity to upstream services, and reverse-proxies traffic to the
`orders`, `inventory`, `payments`, `auth`, and `shipping` services. The TanStack Start web app
(`apps/web`) talks only to this gateway.

## Responsibilities

- **JWT authentication** (HS256, shared `JWT_SECRET` with the auth service). The gateway validates
  the bearer token itself — no round-trip to the auth service.
- **Identity forwarding** — on authenticated requests it sets `X-User-Id` and `X-User-Role` for the
  upstream service and **strips any client-supplied copies** so they cannot be spoofed.
- **Reverse proxy / routing** — path-prefix routing to the backend services (paths are preserved).
- **CORS** for the browser origin (`WEB_ORIGIN`).

## Routes

| Prefix | Upstream | Auth |
|---|---|---|
| `/api/v1/auth/*` | auth | public (login/register/refresh); `/auth/me` requires a token at the service |
| `GET /api/v1/products`, `GET /api/v1/products/:id` | inventory | public |
| `POST/PUT/DELETE /api/v1/products*`, `/api/v1/inventory/*` | inventory | required |
| `/api/v1/cart*`, `/api/v1/orders*` | orders | required |
| `/api/v1/payments*` | payments | required |
| `/api/v1/shipments*` | shipping | required |
| `GET /healthz` | — | public |

## Configuration

See `.env.example`. Key vars: `PORT` (8081), `JWT_SECRET`, `WEB_ORIGIN`, and the upstream URLs
`AUTH_URL` / `ORDERS_URL` / `INVENTORY_URL` / `PAYMENTS_URL` / `SHIPPING_URL`.

## Development

```bash
make tidy    # resolve dependencies
make test    # run unit tests
make run     # run locally on :8081
```

The gateway is only useful alongside the backend services — run the full stack with the root
`docker-compose.yml` at the repo root.
