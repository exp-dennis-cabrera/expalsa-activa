package com.tuempresa.cmms.security;

import com.tuempresa.cmms.model.entity.User;
import lombok.Getter;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;

import java.util.Collection;
import java.util.List;

@Getter
public class CmmsUserDetails implements UserDetails {

    private final Long userId;
    private final Long organizationId;
    private final String email;
    private final String passwordHash;
    private final String roleName;

    public CmmsUserDetails(User user) {
        this.userId = user.getId();
        this.organizationId = user.getOrganizationId();
        this.email = user.getEmail();
        this.passwordHash = user.getPasswordHash();
        // IMPORTANTE: roleName debe ser el CODIGO fijo del rol (ADMIN,
        // LIMITED_ADMIN, etc.), no el nombre en español para mostrar
        // (Administrador, Administrador limitado). Todo el sistema de
        // permisos por rol (RoleNames.ADMIN.equalsIgnoreCase(...), etc.)
        // compara contra este valor -- si aca se pusiera el nombre en
        // español, esas comparaciones dejarian de coincidir aunque el
        // usuario si sea Administrador. Role.code es un enum RoleCode
        // (igual que el real), asi que se usa su .name() para mantener
        // roleName como String, compatible con las comparaciones existentes.
        com.tuempresa.cmms.model.entity.Role role = user.getRole();
        this.roleName = role != null && role.getCode() != null ? role.getCode().name()
                : role != null ? role.getName() : "USER";
    }

    @Override
    public Collection<? extends GrantedAuthority> getAuthorities() {
        return List.of(new SimpleGrantedAuthority("ROLE_" + roleName));
    }

    @Override
    public String getPassword() {
        return passwordHash;
    }

    @Override
    public String getUsername() {
        return email;
    }

    @Override
    public boolean isAccountNonExpired() { return true; }

    @Override
    public boolean isAccountNonLocked() { return true; }

    @Override
    public boolean isCredentialsNonExpired() { return true; }

    @Override
    public boolean isEnabled() { return true; }
}
