package com.tuempresa.cmms.repository;

import com.tuempresa.cmms.model.entity.PushNotificationToken;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface PushNotificationTokenRepository extends JpaRepository<PushNotificationToken, Long> {
    Optional<PushNotificationToken> findByUserId(Long userId);
}
