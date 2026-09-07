package com.tuempresa.cmms.repository;

import com.tuempresa.cmms.model.entity.MailSettings;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface MailSettingsRepository extends JpaRepository<MailSettings, Long> {
    Optional<MailSettings> findByOrganizationId(Long organizationId);
}
