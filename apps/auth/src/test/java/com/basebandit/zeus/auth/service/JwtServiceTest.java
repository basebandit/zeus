package com.basebandit.zeus.auth.service;

import static org.assertj.core.api.Assertions.assertThat;

import com.basebandit.zeus.auth.config.AppProperties;
import com.basebandit.zeus.auth.model.User;
import io.jsonwebtoken.Claims;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

class JwtServiceTest {

    private JwtService jwt;
    private User user;

    @BeforeEach
    void setUp() {
        AppProperties props = new AppProperties();
        props.getJwt().setSecret("dev-insecure-jwt-secret-change-me-in-prod-0123456789");
        props.getJwt().setAccessTtlSeconds(900);
        props.getJwt().setRefreshTtlSeconds(1209600);
        jwt = new JwtService(props);

        user = new User();
        user.setId(UUID.randomUUID());
        user.setEmail("alice@example.com");
        user.setName("Alice");
        user.setRole("customer");
    }

    @Test
    void accessTokenRoundTripsClaims() {
        String token = jwt.generateAccessToken(user);
        Claims claims = jwt.parse(token);

        assertThat(claims.getSubject()).isEqualTo(user.getId().toString());
        assertThat(claims.get("email", String.class)).isEqualTo("alice@example.com");
        assertThat(claims.get("role", String.class)).isEqualTo("customer");
        assertThat(jwt.isRefreshToken(claims)).isFalse();
    }

    @Test
    void accessTokenUsesHs256() {
        // The gateway only accepts HS256; jjwt would otherwise pick HS384/HS512 for a long key.
        String token = jwt.generateAccessToken(user);
        String headerJson = new String(
            java.util.Base64.getUrlDecoder().decode(token.split("\\.")[0]),
            java.nio.charset.StandardCharsets.UTF_8);
        assertThat(headerJson).contains("HS256");
    }

    @Test
    void refreshTokenIsMarked() {
        Claims claims = jwt.parse(jwt.generateRefreshToken(user));
        assertThat(jwt.isRefreshToken(claims)).isTrue();
        assertThat(claims.getSubject()).isEqualTo(user.getId().toString());
    }

    @Test
    void tamperedTokenIsRejected() {
        String token = jwt.generateAccessToken(user);
        String tampered = token.substring(0, token.length() - 2) + "xx";
        org.junit.jupiter.api.Assertions.assertThrows(
            io.jsonwebtoken.JwtException.class, () -> jwt.parse(tampered));
    }
}
