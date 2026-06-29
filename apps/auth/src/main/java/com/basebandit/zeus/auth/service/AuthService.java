package com.basebandit.zeus.auth.service;

import com.basebandit.zeus.auth.dto.AuthDtos.LoginRequest;
import com.basebandit.zeus.auth.dto.AuthDtos.RegisterRequest;
import com.basebandit.zeus.auth.dto.AuthDtos.TokenResponse;
import com.basebandit.zeus.auth.dto.AuthDtos.UserResponse;
import com.basebandit.zeus.auth.model.User;
import com.basebandit.zeus.auth.repository.UserRepository;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.JwtException;
import java.util.UUID;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class AuthService {

    private final UserRepository users;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwt;
    private final EventPublisher events;

    public AuthService(UserRepository users, PasswordEncoder passwordEncoder, JwtService jwt,
                       EventPublisher events) {
        this.users = users;
        this.passwordEncoder = passwordEncoder;
        this.jwt = jwt;
        this.events = events;
    }

    @Transactional
    public TokenResponse register(RegisterRequest req) {
        String email = req.email().trim().toLowerCase();
        if (users.existsByEmail(email)) {
            throw AuthException.conflict("email already registered");
        }
        User user = new User();
        user.setEmail(email);
        user.setName(req.name());
        user.setPasswordHash(passwordEncoder.encode(req.password()));
        user.setRole("customer");
        user = users.save(user);

        events.publishUserRegistered(user);
        return issueTokens(user);
    }

    @Transactional(readOnly = true)
    public TokenResponse login(LoginRequest req) {
        String email = req.email().trim().toLowerCase();
        User user = users.findByEmail(email)
            .orElseThrow(() -> AuthException.unauthorized("invalid credentials"));
        if (!passwordEncoder.matches(req.password(), user.getPasswordHash())) {
            throw AuthException.unauthorized("invalid credentials");
        }
        return issueTokens(user);
    }

    @Transactional(readOnly = true)
    public TokenResponse refresh(String refreshToken) {
        Claims claims = parseOrUnauthorized(refreshToken);
        if (!jwt.isRefreshToken(claims)) {
            throw AuthException.unauthorized("not a refresh token");
        }
        User user = loadUser(claims.getSubject());
        return issueTokens(user);
    }

    @Transactional(readOnly = true)
    public UserResponse me(String accessToken) {
        Claims claims = parseOrUnauthorized(accessToken);
        if (jwt.isRefreshToken(claims)) {
            throw AuthException.unauthorized("refresh token cannot be used for access");
        }
        User user = loadUser(claims.getSubject());
        return toUserResponse(user);
    }

    /** Lightweight identity extraction for ForwardAuth-style edge verification. */
    public UserResponse verify(String accessToken) {
        Claims claims = parseOrUnauthorized(accessToken);
        if (jwt.isRefreshToken(claims)) {
            throw AuthException.unauthorized("refresh token cannot be used for access");
        }
        return new UserResponse(
            claims.getSubject(),
            claims.get("email", String.class),
            null,
            claims.get("role", String.class));
    }

    private Claims parseOrUnauthorized(String token) {
        try {
            return jwt.parse(token);
        } catch (JwtException | IllegalArgumentException e) {
            throw AuthException.unauthorized("invalid or expired token");
        }
    }

    private User loadUser(String subject) {
        UUID id;
        try {
            id = UUID.fromString(subject);
        } catch (IllegalArgumentException e) {
            throw AuthException.unauthorized("invalid token subject");
        }
        return users.findById(id).orElseThrow(() -> AuthException.unauthorized("user not found"));
    }

    private TokenResponse issueTokens(User user) {
        return new TokenResponse(
            jwt.generateAccessToken(user),
            jwt.generateRefreshToken(user),
            "Bearer",
            jwt.getAccessTtlSeconds(),
            toUserResponse(user));
    }

    private UserResponse toUserResponse(User user) {
        return new UserResponse(
            user.getId().toString(), user.getEmail(), user.getName(), user.getRole());
    }
}
