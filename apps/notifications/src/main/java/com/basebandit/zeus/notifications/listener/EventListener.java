package com.basebandit.zeus.notifications.listener;

import com.basebandit.zeus.notifications.config.RabbitConfig;
import com.basebandit.zeus.notifications.service.NotificationService;
import java.util.Map;
import java.util.UUID;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.amqp.rabbit.annotation.RabbitListener;
import org.springframework.stereotype.Component;

/** Consumes events from the shared exchange and delegates to {@link NotificationService}. */
@Component
public class EventListener {

    private static final Logger log = LoggerFactory.getLogger(EventListener.class);

    private final NotificationService notifications;

    public EventListener(NotificationService notifications) {
        this.notifications = notifications;
    }

    @RabbitListener(queues = RabbitConfig.USER_QUEUE)
    public void onUserEvent(Map<String, Object> event) {
        String eventType = str(event.get("eventType"));
        if (!"user.registered".equals(eventType)) {
            log.warn("Ignoring unexpected user event: {}", eventType);
            return;
        }
        notifications.onUserRegistered(
            uuid(event.get("userId")),
            str(event.get("email")),
            str(event.get("name")));
    }

    @RabbitListener(queues = RabbitConfig.ORDER_QUEUE)
    public void onOrderEvent(Map<String, Object> event) {
        String eventType = str(event.get("eventType"));
        log.info("Received {} for order {}", eventType, event.get("orderId"));
        notifications.onOrderEvent(
            eventType,
            uuid(event.get("orderId")),
            uuid(event.get("userId")),
            event);
    }

    private static String str(Object o) {
        return o == null ? null : o.toString();
    }

    private static UUID uuid(Object o) {
        if (o == null) {
            return null;
        }
        try {
            return UUID.fromString(o.toString());
        } catch (IllegalArgumentException e) {
            return null;
        }
    }
}
