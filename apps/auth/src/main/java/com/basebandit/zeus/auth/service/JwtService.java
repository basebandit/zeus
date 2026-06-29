package com.basebandit.zeus.auth.service;

import com.basebandit.zeus.auth.config.AppProperties;
import com.basebandit.zeus.auth.model.User;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.JwtException;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.Date;
import javax.crypto.SecretKey;
import org.springframework.stereotype.Service;

/**
 * Issues and validates HS256 JWTs. The signing secret is shared with the gateway so it can validate
 * access tokens without calling this service. Access tokens carry {@code sub}, {@code email} and
 * {@code role}; refresh tokens additionally carry {@code type=refresh}.
 */
@Service
public class JwtService {

    private final SecretKey key;
    private final AppProperties.Jwt cfg;

    public JwtService(AppProperties props) {
        this.cfg = props.getJwt();
        this.key = Keys.hmacShaKeyFor(cfg.getSecret().getBytes(StandardCharsets.UTF_8));
    }

    public String generateAccessToken(User user) {
        Instant now = Instant.now();
        return Jwts.builder()
            .issuer(cfg.getIssuer())
            .subject(user.getId().toString())
            .claim("email", user.getEmail())
            .claim("role", user.getRole())
            .issuedAt(Date.from(now))
            .expiration(Date.from(now.plusSeconds(cfg.getAccessTtlSeconds())))
            .signWith(key, Jwts.SIG.HS256)
            .compact();
    }

    public String generateRefreshToken(User user) {
        Instant now = Instant.now();
        return Jwts.builder()
            .issuer(cfg.getIssuer())
            .subject(user.getId().toString())
            .claim("type", "refresh")
            .issuedAt(Date.from(now))
            .expiration(Date.from(now.plusSeconds(cfg.getRefreshTtlSeconds())))
            .signWith(key, Jwts.SIG.HS256)
            .compact();
    }

    public long getAccessTtlSeconds() {
        return cfg.getAccessTtlSeconds();
    }

    /** Parses and validates a token signature/expiry, returning its claims. */
    public Claims parse(String token) throws JwtException {
        return Jwts.parser()
            .verifyWith(key)
            .build()
            .parseSignedClaims(token)
            .getPayload();
    }

    public boolean isRefreshToken(Claims claims) {
        return "refresh".equals(claims.get("type", String.class));
    }
}
