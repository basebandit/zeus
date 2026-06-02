package com.basebandit.zeus.notifications.model;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "notifications")
public class Notification {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(nullable = false)
    private String recipient;

    @Column(nullable = false)
    private String type;

    @Column(name = "order_id")
    private UUID orderId;

    @Column(nullable = false)
    private String status;

    @Column(name = "sent_at", nullable = false, updatable = false)
    private Instant sentAt;

    protected Notification() {
    }

    public Notification(String recipient, String type, UUID orderId, String status) {
        this.recipient = recipient;
        this.type = type;
        this.orderId = orderId;
        this.status = status;
    }

    @PrePersist
    void onCreate() {
        if (sentAt == null) {
            sentAt = Instant.now();
        }
    }

    public UUID getId() {
        return id;
    }

    public String getRecipient() {
        return recipient;
    }

    public String getType() {
        return type;
    }

    public UUID getOrderId() {
        return orderId;
    }

    public String getStatus() {
        return status;
    }
}
