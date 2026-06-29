package com.basebandit.zeus.auth.service;

import com.basebandit.zeus.auth.config.AppProperties;
import com.basebandit.zeus.auth.model.User;
import java.time.Instant;
import java.util.Map;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.amqp.AmqpException;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.stereotype.Component;

/** Publishes auth domain events to the shared {@code basebandit.events} topic exchange. */
@Component
public class EventPublisher {

    private static final Logger log = LoggerFactory.getLogger(EventPublisher.class);

    private final RabbitTemplate rabbitTemplate;
    private final String exchange;

    public EventPublisher(RabbitTemplate rabbitTemplate, AppProperties props) {
        this.rabbitTemplate = rabbitTemplate;
        this.exchange = props.getRabbitmq().getExchange();
    }

    public void publishUserRegistered(User user) {
        Map<String, Object> event = Map.of(
            "eventType", "user.registered",
            "userId", user.getId().toString(),
            "email", user.getEmail(),
            "name", user.getName(),
            "timestamp", Instant.now().toString());
        try {
            rabbitTemplate.convertAndSend(exchange, "user.registered", event);
            log.info("Published event: user.registered for {}", user.getId());
        } catch (AmqpException e) {
            // A welcome email is non-critical; don't fail registration if the broker is down.
            log.error("Failed to publish user.registered for {}", user.getId(), e);
        }
    }
}
