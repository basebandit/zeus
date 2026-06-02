# Notifications Service

Customer notifications for the Zeus e-commerce platform (Java 17 / Spring Boot 3, Spring AMQP +
`JavaMailSender`). This is the one service introduced in a new language for the platform's polyglot
architecture. It has no public API beyond `/healthz` — it reacts to events.

## Event flow

Consumes from the shared `basebandit.events` topic exchange (durable queues + `*.dlq`, 3 retries
then dead-letter):

- `notifications.user_events` ← `user.registered`
- `notifications.order_events` ← `order.confirmed`, `order.cancelled`, `order.shipped`,
  `order.delivered`, `payment.failed`

## Recipient read model

Order events only carry a `userId`, not an email. The service consumes `user.registered` to maintain
a local `recipients(user_id, email, name)` table and looks up the address when an order event
arrives. Orders for users it has never seen are logged and audited as `skipped` (no email).

Every attempt is recorded in `notifications(id, recipient, type, order_id, status, sent_at)`.

## Email

Sent via SMTP (`MAIL_HOST`/`MAIL_PORT`). Local dev uses **MailHog** — view messages at
http://localhost:8025.

## Development

```bash
mvn test           # unit tests for NotificationService
mvn spring-boot:run
docker compose up   # postgres + mailhog + service (RabbitMQ expected on the host)
```
