package com.basebandit.zeus.notifications.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "app")
public class AppProperties {

    private final Rabbitmq rabbitmq = new Rabbitmq();
    private final Mail mail = new Mail();

    public Rabbitmq getRabbitmq() {
        return rabbitmq;
    }

    public Mail getMail() {
        return mail;
    }

    public static class Rabbitmq {
        private String exchange = "basebandit.events";

        public String getExchange() {
            return exchange;
        }

        public void setExchange(String exchange) {
            this.exchange = exchange;
        }
    }

    public static class Mail {
        private String from = "no-reply@zeus.shop";

        public String getFrom() {
            return from;
        }

        public void setFrom(String from) {
            this.from = from;
        }
    }
}
