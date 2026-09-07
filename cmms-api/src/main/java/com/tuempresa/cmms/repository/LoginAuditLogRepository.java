package com.tuempresa.cmms.repository;

import com.tuempresa.cmms.model.entity.LoginAuditLog;
import org.springframework.data.jpa.repository.JpaRepository;

public interface LoginAuditLogRepository extends JpaRepository<LoginAuditLog, Long> {
}
