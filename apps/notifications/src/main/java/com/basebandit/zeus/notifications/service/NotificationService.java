package com.basebandit.zeus.notifications.service;

import com.basebandit.zeus.notifications.model.Notification;
import com.basebandit.zeus.notifications.model.Recipient;
import com.basebandit.zeus.notifications.repository.NotificationRepository;
import com.basebandit.zeus.notifications.repository.RecipientRepository;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

/**
 * Turns domain events into customer emails. Recipient addresses come from a local read model built
 * from {@code user.registered} events, so order events (which only carry a userId) can be addressed.
 */
@Service
public class NotificationService {

    private static final Logger log = LoggerFactory.getLogger(NotificationService.class);

    private final RecipientRepository recipients;
    private final NotificationRepository notifications;
    private final EmailService email;

    public NotificationService(RecipientRepository recipients, NotificationRepository notifications,
                               EmailService email) {
        this.recipients = recipients;
        this.notifications = notifications;
        this.email = email;
    }

    /** Upsert the recipient read model and send a welcome email. */
    public void onUserRegistered(UUID userId, String address, String name) {
        Recipient recipient = recipients.findById(userId)
            .map(r -> {
                r.setEmail(address);
                r.setName(name);
                return r;
            })
            .orElseGet(() -> new Recipient(userId, address, name));
        recipients.save(recipient);

        deliver(address, "user.registered", null,
            "Welcome to Zeus, " + safeName(name) + "!",
            "Hi " + safeName(name) + ",\n\nYour Zeus account is ready. Happy shopping!");
    }

    /** Compose and send the email for an order/payment event. */
    public void onOrderEvent(String eventType, UUID orderId, UUID userId, Map<String, Object> data) {
        Optional<Recipient> recipient = userId == null
            ? Optional.empty()
            : recipients.findById(userId);

        if (recipient.isEmpty()) {
            log.warn("No recipient for user {} (event {}); skipping email", userId, eventType);
            notifications.save(new Notification("unknown", eventType, orderId, "skipped"));
            return;
        }

        String to = recipient.get().getEmail();
        String subject;
        String body;
        switch (eventType) {
            case "order.confirmed" -> {
                subject = "Your Zeus order is confirmed";
                body = "Good news! Order " + orderId + " is confirmed and is being prepared.";
            }
            case "order.shipped" -> {
                subject = "Your Zeus order has shipped";
                body = "Order " + orderId + " has shipped. Tracking: "
                    + data.getOrDefault("trackingNumber", "N/A") + ".";
            }
            case "order.delivered" -> {
                subject = "Your Zeus order was delivered";
                body = "Order " + orderId + " has been delivered. Enjoy!";
            }
            case "order.cancelled" -> {
                subject = "Your Zeus order was cancelled";
                body = "Order " + orderId + " was cancelled. Reason: "
                    + data.getOrDefault("reason", "unspecified") + ".";
            }
            case "payment.failed" -> {
                subject = "Payment failed for your Zeus order";
                body = "We couldn't process payment for order " + orderId + ". Reason: "
                    + data.getOrDefault("reason", "unspecified") + ".";
            }
            default -> {
                log.warn("Unhandled event type: {}", eventType);
                return;
            }
        }
        deliver(to, eventType, orderId, subject, body);
    }

    private void deliver(String to, String type, UUID orderId, String subject, String body) {
        try {
            email.send(to, subject, body);
            notifications.save(new Notification(to, type, orderId, "sent"));
            log.info("Sent {} email to {}", type, to);
        } catch (Exception e) {
            notifications.save(new Notification(to, type, orderId, "failed"));
            log.error("Failed to send {} email to {}", type, to, e);
            throw e; // trigger listener retry / DLQ
        }
    }

    private String safeName(String name) {
        return (name == null || name.isBlank()) ? "there" : name;
    }
}
