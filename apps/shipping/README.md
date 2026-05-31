# Shipping Service

Order fulfillment for the Zeus e-commerce platform (Python 3.12 / FastAPI). Mirrors the `payments`
service structure. It owns the **shipment** domain and closes the order saga loop.

## Event flow

Consumes (queue `shipping.order_events`, DLQ `shipping.order_events.dlq`):

- `order.confirmed` → create a shipment, publish `shipment.created`, then simulate packing/dispatch
  and publish `shipment.shipped` (with a generated tracking number).
- `order.cancelled` → cancel the shipment if it hasn't shipped yet.

Publishes to the shared `basebandit.events` topic exchange:

- `shipment.created`, `shipment.shipped`, `shipment.delivered`.

The orders service consumes `shipment.shipped` / `shipment.delivered` to advance the order status and
re-emit `order.shipped` / `order.delivered`.

## API

| Method | Path | Description |
|---|---|---|
| GET  | `/api/v1/shipments/order/{order_id}` | Shipment for an order |
| GET  | `/api/v1/shipments/{shipment_id}` | Shipment by id |
| POST | `/api/v1/shipments/{shipment_id}/deliver` | Simulate delivery → publish `shipment.delivered` |
| GET  | `/healthz` | Liveness |

## Data model

`shipments(id, order_id unique, user_id, status[pending|packed|shipped|delivered|cancelled],
carrier, tracking_number, address jsonb, created_at, updated_at)`.

## Development

```bash
uv sync                      # install deps + create uv.lock
uv run alembic upgrade head  # apply migrations (DB on :5437)
uv run pytest                # unit tests
uv run uvicorn main:app --port 8085 --reload
docker compose up            # postgres + service (RabbitMQ expected on the host)
```
