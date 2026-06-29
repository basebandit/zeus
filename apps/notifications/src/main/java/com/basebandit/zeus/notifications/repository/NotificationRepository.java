package com.basebandit.zeus.notifications.repository;

import com.basebandit.zeus.notifications.model.Notification;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface NotificationRepository extends JpaRepository<Notification, UUID> {
}
