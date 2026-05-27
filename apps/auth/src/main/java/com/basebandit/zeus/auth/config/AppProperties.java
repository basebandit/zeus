package com.basebandit.zeus.auth.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "app")
public class AppProperties {

    private final Jwt jwt = new Jwt();
    private final Rabbitmq rabbitmq = new Rabbitmq();

    public Jwt getJwt() {
        return jwt;
    }

    public Rabbitmq getRabbitmq() {
        return rabbitmq;
    }

    public static class Jwt {
        private String secret;
        private long accessTtlSeconds = 900;
        private long refreshTtlSeconds = 1_209_600;
        private String issuer = "zeus-auth";

        public String getSecret() {
            return secret;
        }

        public void setSecret(String secret) {
            this.secret = secret;
        }

        public long getAccessTtlSeconds() {
            return accessTtlSeconds;
        }

        public void setAccessTtlSeconds(long accessTtlSeconds) {
            this.accessTtlSeconds = accessTtlSeconds;
        }

        public long getRefreshTtlSeconds() {
            return refreshTtlSeconds;
        }

        public void setRefreshTtlSeconds(long refreshTtlSeconds) {
            this.refreshTtlSeconds = refreshTtlSeconds;
        }

        public String getIssuer() {
            return issuer;
        }

        public void setIssuer(String issuer) {
            this.issuer = issuer;
        }
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
}
