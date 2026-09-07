package com.tuempresa.cmms.model.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.Setter;

import java.time.Instant;

/**
 * Registro de cada intento de inicio de sesion (exitoso o fallido), para
 * trazabilidad -- control ISO 27001 A.8.15 (logging). A proposito NO
 * extiende BaseTenantEntity: un intento fallido puede no corresponder a
 * ningun usuario/organizacion real (email inexistente), asi que la
 * organizacion queda como campo opcional propio, no el filtro automatico
 * de tenant.
 */
@Entity
@Table(name = "login_audit_log")
@Getter
@Setter
public class LoginAuditLog {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String email;

    @Column(nullable = false)
    private Boolean success;

    // Motivo cuando fallo: BAD_CREDENTIALS, ACCOUNT_LOCKED, ACCOUNT_INACTIVE, UNKNOWN_EMAIL.
    private String failureReason;

    private String ipAddress;
    private String userAgent;
    private Long organizationId;
    private Long userId;

    @Column(nullable = false)
    private Instant occurredAt;
}
