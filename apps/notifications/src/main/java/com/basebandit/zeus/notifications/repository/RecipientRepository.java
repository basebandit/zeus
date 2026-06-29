package com.basebandit.zeus.notifications.repository;

import com.basebandit.zeus.notifications.model.Recipient;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface RecipientRepository extends JpaRepository<Recipient, UUID> {
}
