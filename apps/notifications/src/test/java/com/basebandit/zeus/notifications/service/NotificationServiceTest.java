package com.basebandit.zeus.notifications.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.basebandit.zeus.notifications.model.Notification;
import com.basebandit.zeus.notifications.model.Recipient;
import com.basebandit.zeus.notifications.repository.NotificationRepository;
import com.basebandit.zeus.notifications.repository.RecipientRepository;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;

class NotificationServiceTest {

    private RecipientRepository recipients;
    private NotificationRepository notifications;
    private EmailService email;
    private NotificationService service;

    @BeforeEach
    void setUp() {
        recipients = mock(RecipientRepository.class);
        notifications = mock(NotificationRepository.class);
        email = mock(EmailService.class);
        service = new NotificationService(recipients, notifications, email);
    }

    @Test
    void onUserRegisteredSavesRecipientAndSendsWelcome() {
        UUID userId = UUID.randomUUID();
        when(recipients.findById(userId)).thenReturn(Optional.empty());

        service.onUserRegistered(userId, "alice@example.com", "Alice");

        verify(recipients).save(any(Recipient.class));
        verify(email).send(eq("alice@example.com"), any(), any());
        verify(notifications).save(any(Notification.class));
    }

    @Test
    void orderConfirmedSendsEmailToKnownRecipient() {
        UUID userId = UUID.randomUUID();
        UUID orderId = UUID.randomUUID();
        when(recipients.findById(userId))
            .thenReturn(Optional.of(new Recipient(userId, "alice@example.com", "Alice")));

        service.onOrderEvent("order.confirmed", orderId, userId,
            Map.of("eventType", "order.confirmed", "orderId", orderId.toString()));

        ArgumentCaptor<String> subject = ArgumentCaptor.forClass(String.class);
        verify(email).send(eq("alice@example.com"), subject.capture(), any());
        assertThat(subject.getValue()).containsIgnoringCase("confirmed");

        ArgumentCaptor<Notification> note = ArgumentCaptor.forClass(Notification.class);
        verify(notifications).save(note.capture());
        assertThat(note.getValue().getStatus()).isEqualTo("sent");
    }

    @Test
    void orderShippedIncludesTrackingNumber() {
        UUID userId = UUID.randomUUID();
        UUID orderId = UUID.randomUUID();
        when(recipients.findById(userId))
            .thenReturn(Optional.of(new Recipient(userId, "alice@example.com", "Alice")));

        service.onOrderEvent("order.shipped", orderId, userId,
            Map.of("eventType", "order.shipped", "trackingNumber", "ZX0123456789AB"));

        ArgumentCaptor<String> body = ArgumentCaptor.forClass(String.class);
        verify(email).send(eq("alice@example.com"), any(), body.capture());
        assertThat(body.getValue()).contains("ZX0123456789AB");
    }

    @Test
    void unknownRecipientIsSkippedWithoutEmail() {
        UUID userId = UUID.randomUUID();
        UUID orderId = UUID.randomUUID();
        when(recipients.findById(userId)).thenReturn(Optional.empty());

        service.onOrderEvent("order.confirmed", orderId, userId, Map.of());

        verify(email, never()).send(any(), any(), any());
        ArgumentCaptor<Notification> note = ArgumentCaptor.forClass(Notification.class);
        verify(notifications).save(note.capture());
        assertThat(note.getValue().getStatus()).isEqualTo("skipped");
    }
}
