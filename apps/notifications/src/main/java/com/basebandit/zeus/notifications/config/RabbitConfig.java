package com.basebandit.zeus.notifications.config;

import org.springframework.amqp.core.Binding;
import org.springframework.amqp.core.BindingBuilder;
import org.springframework.amqp.core.Declarables;
import org.springframework.amqp.core.Queue;
import org.springframework.amqp.core.QueueBuilder;
import org.springframework.amqp.core.TopicExchange;
import org.springframework.amqp.support.converter.DefaultJackson2JavaTypeMapper;
import org.springframework.amqp.support.converter.Jackson2JavaTypeMapper.TypePrecedence;
import org.springframework.amqp.support.converter.Jackson2JsonMessageConverter;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/**
 * Declares the consumer topology following the platform convention: durable queues with a sibling
 * {@code *.dlq} dead-letter queue. Spring AMQP retries each message up to 3 times (see
 * application.yml); on exhaustion the message is rejected without requeue and dead-lettered.
 */
@Configuration
@EnableConfigurationProperties(AppProperties.class)
public class RabbitConfig {

    public static final String ORDER_QUEUE = "notifications.order_events";
    public static final String ORDER_DLQ = "notifications.order_events.dlq";
    public static final String USER_QUEUE = "notifications.user_events";
    public static final String USER_DLQ = "notifications.user_events.dlq";

    private static final String[] ORDER_KEYS = {
        "order.confirmed", "order.cancelled", "order.shipped", "order.delivered", "payment.failed"
    };

    @Bean
    TopicExchange eventsExchange(AppProperties props) {
        return new TopicExchange(props.getRabbitmq().getExchange(), true, false);
    }

    @Bean
    Declarables topology(TopicExchange exchange) {
        Queue orderQueue = QueueBuilder.durable(ORDER_QUEUE)
            .deadLetterExchange(exchange.getName())
            .deadLetterRoutingKey(ORDER_DLQ)
            .build();
        Queue orderDlq = QueueBuilder.durable(ORDER_DLQ).build();

        Queue userQueue = QueueBuilder.durable(USER_QUEUE)
            .deadLetterExchange(exchange.getName())
            .deadLetterRoutingKey(USER_DLQ)
            .build();
        Queue userDlq = QueueBuilder.durable(USER_DLQ).build();

        Declarables declarables = new Declarables(
            orderQueue, orderDlq, userQueue, userDlq,
            BindingBuilder.bind(orderDlq).to(exchange).with(ORDER_DLQ),
            BindingBuilder.bind(userQueue).to(exchange).with("user.registered"),
            BindingBuilder.bind(userDlq).to(exchange).with(USER_DLQ));

        for (String key : ORDER_KEYS) {
            Binding b = BindingBuilder.bind(orderQueue).to(exchange).with(key);
            declarables.getDeclarables().add(b);
        }
        return declarables;
    }

    @Bean
    Jackson2JsonMessageConverter jsonMessageConverter() {
        Jackson2JsonMessageConverter converter = new Jackson2JsonMessageConverter();
        // Events arrive from Go/TS/Python (no type headers) and from the JVM auth service
        // (which stamps a __TypeId__ of an immutable Map). Prefer the listener's inferred
        // Map type over any incoming __TypeId__ so all of them deserialize uniformly.
        DefaultJackson2JavaTypeMapper typeMapper = new DefaultJackson2JavaTypeMapper();
        typeMapper.setTypePrecedence(TypePrecedence.INFERRED);
        converter.setJavaTypeMapper(typeMapper);
        return converter;
    }
}
