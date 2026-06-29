package com.basebandit.zeus.auth.service;

import org.springframework.http.HttpStatus;

/** Domain error carrying the HTTP status the API should return. */
public class AuthException extends RuntimeException {

    private final HttpStatus status;

    public AuthException(HttpStatus status, String message) {
        super(message);
        this.status = status;
    }

    public HttpStatus getStatus() {
        return status;
    }

    public static AuthException conflict(String message) {
        return new AuthException(HttpStatus.CONFLICT, message);
    }

    public static AuthException unauthorized(String message) {
        return new AuthException(HttpStatus.UNAUTHORIZED, message);
    }
}
