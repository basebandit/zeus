package com.basebandit.zeus.auth.web;

import com.basebandit.zeus.auth.service.AuthException;
import java.time.Instant;
import java.util.Map;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

@RestControllerAdvice
public class GlobalExceptionHandler {

    @ExceptionHandler(AuthException.class)
    public ResponseEntity<Map<String, Object>> handleAuth(AuthException e) {
        return ResponseEntity.status(e.getStatus()).body(body(e.getStatus(), e.getMessage()));
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<Map<String, Object>> handleValidation(MethodArgumentNotValidException e) {
        String message = e.getBindingResult().getFieldErrors().stream()
            .findFirst()
            .map(err -> err.getField() + ": " + err.getDefaultMessage())
            .orElse("validation failed");
        return ResponseEntity.badRequest().body(body(HttpStatus.BAD_REQUEST, message));
    }

    private Map<String, Object> body(HttpStatus status, String message) {
        return Map.of(
            "timestamp", Instant.now().toString(),
            "status", status.value(),
            "error", status.getReasonPhrase(),
            "message", message);
    }
}
