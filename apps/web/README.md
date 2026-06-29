# Web (Storefront)

The customer-facing storefront for the Zeus e-commerce platform, built with **TanStack Start**
(React 19 + TanStack Router + Vite 8, Tailwind v4). It is the only client; its server layer (server
functions in `src/lib/server/`) acts as the **BFF** and talks exclusively to the API **gateway**.

## Architecture

- **SSR + BFF**: route `loader`s and `createServerFn` server functions run on the server, attach the
  JWT (stored in an httpOnly cookie) and call the gateway. The browser never sees the gateway.
- **Auth**: `login`/`register` server functions store `zeus_access` / `zeus_refresh` httpOnly
  cookies. The root route's `beforeLoad` resolves the current user (with one-shot refresh on 401)
  and exposes it via router context; protected routes (`/cart`, `/checkout`, `/orders*`) redirect to
  `/login` when unauthenticated.

## Routes

`/` storefront · `/products/$id` detail · `/cart` · `/checkout` · `/orders` history ·
`/orders/$id` detail with saga status **timeline** + tracking + "simulate delivery" · `/login` ·
`/register`.

## Configuration

`GATEWAY_URL` (default `http://localhost:8081`) — base URL of the API gateway.

## Development

Requires **Node 20+** (Node 22 recommended; TanStack Start tooling needs ≥ 20.19).

```bash
npm install
npm run dev       # http://localhost:3000
npm run build     # production build (emits a fetch handler)
npx tsc --noEmit  # type-check
```

## End-to-end tests (Playwright)

`tests/e2e/` drives the real storefront through a headless browser (catalog → register →
add-to-cart with badge → cart → checkout → itemised order receipt → shipped → delivered).
They run against a **running stack**, so start it and seed the catalog first:

```bash
# from the repo root
docker compose up --build
./apps/inventory/seed-products.sh

# then, in apps/web
npx playwright install chromium   # first time only
npm run test:e2e                  # headless run
npm run test:e2e:ui               # interactive UI mode
npm run test:e2e:report           # open the last HTML report
```

> The happy-path journey expects payments to succeed, so run the stack with
> `PAYMENT_GATEWAY_SUCCESS_RATE=1.0` for the payments service (the default `0.9` randomly declines
> ~10% of orders to exercise the compensation path).

Target another environment with `PLAYWRIGHT_BASE_URL` (default `http://localhost:3000`). Stable
`data-testid` hooks and a `data-hydrated` sentinel on `<html>` keep the tests resilient to markup
changes and SSR hydration timing.

> Deployment note: `npm run build` produces a Web `fetch` handler, not a self-hosting server. A
> production deployment needs a TanStack Start deployment adapter (nitro / node-server); that is a
> deploy-round task. The container in the root `docker-compose.yml` runs the Vite dev server, which
> serves SSR + the BFF for the dev estate.
