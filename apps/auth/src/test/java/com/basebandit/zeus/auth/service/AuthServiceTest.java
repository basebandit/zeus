package com.basebandit.zeus.auth.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.basebandit.zeus.auth.config.AppProperties;
import com.basebandit.zeus.auth.dto.AuthDtos.LoginRequest;
import com.basebandit.zeus.auth.dto.AuthDtos.RegisterRequest;
import com.basebandit.zeus.auth.dto.AuthDtos.TokenResponse;
import com.basebandit.zeus.auth.model.User;
import com.basebandit.zeus.auth.repository.UserRepository;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;

class AuthServiceTest {

    private UserRepository users;
    private EventPublisher events;
    private AuthService service;
    private final PasswordEncoder encoder = new BCryptPasswordEncoder();

    @BeforeEach
    void setUp() {
        users = org.mockito.Mockito.mock(UserRepository.class);
        events = org.mockito.Mockito.mock(EventPublisher.class);
        AppProperties props = new AppProperties();
        props.getJwt().setSecret("dev-insecure-jwt-secret-change-me-in-prod-0123456789");
        service = new AuthService(users, encoder, new JwtService(props), events);
    }

    @Test
    void registerRejectsDuplicateEmail() {
        when(users.existsByEmail("alice@example.com")).thenReturn(true);
        assertThatThrownBy(() -> service.register(
            new RegisterRequest("alice@example.com", "password123", "Alice")))
            .isInstanceOf(AuthException.class);
    }

    @Test
    void registerPersistsHashesPasswordAndPublishesEvent() {
        when(users.existsByEmail(any())).thenReturn(false);
        when(users.save(any(User.class))).thenAnswer(inv -> {
            User u = inv.getArgument(0);
            u.setId(UUID.randomUUID());
            return u;
        });

        TokenResponse resp = service.register(
            new RegisterRequest("Alice@Example.com", "password123", "Alice"));

        ArgumentCaptor<User> captor = ArgumentCaptor.forClass(User.class);
        verify(users).save(captor.capture());
        User saved = captor.getValue();
        assertThat(saved.getEmail()).isEqualTo("alice@example.com"); // normalised
        assertThat(saved.getPasswordHash()).isNotEqualTo("password123");
        assertThat(encoder.matches("password123", saved.getPasswordHash())).isTrue();
        assertThat(resp.accessToken()).isNotBlank();
        assertThat(resp.refreshToken()).isNotBlank();
        verify(events).publishUserRegistered(any(User.class));
    }

    @Test
    void loginWithWrongPasswordIsUnauthorized() {
        User user = new User();
        user.setId(UUID.randomUUID());
        user.setEmail("alice@example.com");
        user.setPasswordHash(encoder.encode("password123"));
        when(users.findByEmail("alice@example.com")).thenReturn(Optional.of(user));

        assertThatThrownBy(() -> service.login(new LoginRequest("alice@example.com", "wrong")))
            .isInstanceOf(AuthException.class);
    }

    @Test
    void loginSuccessReturnsTokens() {
        User user = new User();
        user.setId(UUID.randomUUID());
        user.setEmail("alice@example.com");
        user.setName("Alice");
        user.setRole("customer");
        user.setPasswordHash(encoder.encode("password123"));
        when(users.findByEmail("alice@example.com")).thenReturn(Optional.of(user));

        TokenResponse resp = service.login(new LoginRequest("alice@example.com", "password123"));
        assertThat(resp.accessToken()).isNotBlank();
        assertThat(resp.user().email()).isEqualTo("alice@example.com");
    }
}
