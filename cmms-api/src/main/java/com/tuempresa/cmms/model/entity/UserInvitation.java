package com.tuempresa.cmms.model.entity;

import com.tuempresa.cmms.tenant.BaseTenantEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.Setter;

/**
 * Invitacion pendiente: igual que Atlas, NO se crea el User todavia.
 * Solo se crea la cuenta real cuando la persona invitada acepta y define
 * su propia contrasena (ver AuthService.acceptInvitation()).
 */
@Entity
@Table(name = "user_invitations")
@Getter
@Setter
public class UserInvitation extends BaseTenantEntity {

    @Column(nullable = false)
    private String email;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "role_id", nullable = false)
    private Role role;
}
