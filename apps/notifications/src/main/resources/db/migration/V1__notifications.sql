-- Local read model of users, populated from user.registered events, so order
-- notifications (which only carry userId) can be addressed to an email.
CREATE TABLE recipients (
    user_id    UUID PRIMARY KEY,
    email      VARCHAR(255) NOT NULL,
    name       VARCHAR(255),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Audit log of notifications the service attempted to deliver.
CREATE TABLE notifications (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    recipient  VARCHAR(255) NOT NULL,
    type       VARCHAR(64)  NOT NULL,
    order_id   UUID,
    status     VARCHAR(20)  NOT NULL,
    sent_at    TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE INDEX idx_notifications_order_id ON notifications (order_id);
