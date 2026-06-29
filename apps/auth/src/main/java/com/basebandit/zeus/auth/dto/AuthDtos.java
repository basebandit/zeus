package com.basebandit.zeus.auth.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/** Request/response payloads for the auth API. */
public final class AuthDtos {

    private AuthDtos() {
    }

    public record RegisterRequest(
        @Email @NotBlank String email,
        @NotBlank @Size(min = 8, max = 100) String password,
        @NotBlank String name) {
    }

    public record LoginRequest(
        @Email @NotBlank String email,
        @NotBlank String password) {
    }

    public record RefreshRequest(@NotBlank String refreshToken) {
    }

    public record TokenResponse(
        String accessToken,
        String refreshToken,
        String tokenType,
        long expiresIn,
        UserResponse user) {
    }

    public record UserResponse(String id, String email, String name, String role) {
    }
}
