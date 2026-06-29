package com.basebandit.zeus.notifications.web;

import java.util.Map;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class HealthController {

    @GetMapping("/healthz")
    public Map<String, String> healthz() {
        return Map.of("status", "healthy", "service", "notifications");
    }
}
