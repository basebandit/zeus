package com.basebandit.zeus.auth.web;

import com.basebandit.zeus.auth.dto.AuthDtos.LoginRequest;
import com.basebandit.zeus.auth.dto.AuthDtos.RefreshRequest;
import com.basebandit.zeus.auth.dto.AuthDtos.RegisterRequest;
import com.basebandit.zeus.auth.dto.AuthDtos.TokenResponse;
import com.basebandit.zeus.auth.dto.AuthDtos.UserResponse;
import com.basebandit.zeus.auth.service.AuthException;
import com.basebandit.zeus.auth.service.AuthService;
import jakarta.validation.Valid;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/auth")
public class AuthController {

    private final AuthService auth;

    public AuthController(AuthService auth) {
        this.auth = auth;
    }

    @PostMapping("/register")
    @ResponseStatus(HttpStatus.CREATED)
    public TokenResponse register(@Valid @RequestBody RegisterRequest req) {
        return auth.register(req);
    }

    @PostMapping("/login")
    public TokenResponse login(@Valid @RequestBody LoginRequest req) {
        return auth.login(req);
    }

    @PostMapping("/refresh")
    public TokenResponse refresh(@Valid @RequestBody RefreshRequest req) {
        return auth.refresh(req.refreshToken());
    }

    @GetMapping("/me")
    public UserResponse me(@RequestHeader(value = HttpHeaders.AUTHORIZATION, required = false) String authorization) {
        return auth.me(bearer(authorization));
    }

    /**
     * Validates a token and returns identity headers. Intended for a future Traefik ForwardAuth
     * edge: a 2xx means allow, with {@code X-User-Id}/{@code X-User-Role} forwarded upstream.
     */
    @GetMapping("/verify")
    public ResponseEntity<Void> verify(
        @RequestHeader(value = HttpHeaders.AUTHORIZATION, required = false) String authorization) {
        UserResponse user = auth.verify(bearer(authorization));
        return ResponseEntity.ok()
            .header("X-User-Id", user.id())
            .header("X-User-Role", user.role() == null ? "customer" : user.role())
            .build();
    }

    private String bearer(String authorization) {
        if (authorization == null || !authorization.startsWith("Bearer ")) {
            throw AuthException.unauthorized("missing or malformed Authorization header");
        }
        return authorization.substring("Bearer ".length());
    }
}
