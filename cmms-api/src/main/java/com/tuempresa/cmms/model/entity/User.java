package com.tuempresa.cmms.model.entity;

import com.tuempresa.cmms.model.enums.UserStatus;
import com.tuempresa.cmms.tenant.BaseTenantEntity;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

@Entity
@Table(name = "users", uniqueConstraints = @UniqueConstraint(columnNames = "email"))
@Getter
@Setter
public class User extends BaseTenantEntity {

    @Column(nullable = false)
    private String email;

    @Column(name = "password_hash", nullable = false)
    private String passwordHash;

    private String firstName;
    private String lastName;
    private String phone;
    private String jobTitle;

    @Enumerated(EnumType.STRING)
    private UserStatus status = UserStatus.INVITED;

    private Double hourlyRate;

    private String avatarStorageKey;

    // Bloqueo de cuenta por intentos fallidos (control ISO 27001 A.8.5).
    private Integer failedLoginAttempts = 0;
    private java.time.Instant lockedUntil;

    // Verificacion de correo al auto-registrarse (no aplica a invitaciones,
    // que ya vienen vetadas por un Admin).
    private Boolean emailVerified = true;

    // MFA (TOTP) opcional por usuario -- control ISO 27001, mas esperado
    // para roles Admin.
    private Boolean mfaEnabled = false;
    private String mfaSecret;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "role_id")
    private Role role;
}
