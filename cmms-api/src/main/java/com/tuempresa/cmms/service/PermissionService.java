package com.tuempresa.cmms.service;

import com.tuempresa.cmms.exception.ForbiddenOperationException;
import com.tuempresa.cmms.model.entity.Role;
import com.tuempresa.cmms.model.entity.User;
import com.tuempresa.cmms.model.enums.PermissionEntity;
import com.tuempresa.cmms.repository.UserRepository;
import com.tuempresa.cmms.security.CurrentUserProvider;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

/**
 * Copia fiel de las 5 funciones de permiso reales (AuthContext.tsx:
 * hasViewPermission, hasViewOtherPermission, hasCreatePermission,
 * hasEditPermission, hasDeletePermission) -- misma logica exacta, incluida
 * la regla especial de "estoy asignado a este registro" para
 * WORK_ORDERS/METERS/ASSETS/LOCATIONS.
 */
@Service
@RequiredArgsConstructor
public class PermissionService {

    private final UserRepository userRepository;
    private final CurrentUserProvider currentUser;

    private Role currentRole() {
        User user = userRepository.findByIdWithRole(currentUser.userId()).orElse(null);
        return user != null ? user.getRole() : null;
    }

    public boolean hasViewPermission(PermissionEntity entity) {
        Role role = currentRole();
        return role != null && role.getViewPermissions().contains(entity);
    }

    public boolean hasViewOtherPermission(PermissionEntity entity) {
        Role role = currentRole();
        return role != null && role.getViewOtherPermissions().contains(entity);
    }

    public boolean hasCreatePermission(PermissionEntity entity) {
        Role role = currentRole();
        return role != null && role.getCreatePermissions().contains(entity);
    }

    /**
     * Igual regla exacta que el real: dueño del registro, o el rol tiene
     * editOtherPermissions para esa entidad, o (segun el tipo de entidad)
     * estoy asignado como trabajador/equipo/primaryUser de ese registro.
     */
    public boolean hasEditPermission(PermissionEntity entity, Long createdById, java.util.Collection<Long> assignedUserIds) {
        if (createdById != null && createdById.equals(currentUser.userId())) return true;
        Role role = currentRole();
        if (role != null && role.getEditOtherPermissions().contains(entity)) return true;
        return assignedUserIds != null && assignedUserIds.contains(currentUser.userId());
    }

    public boolean hasDeletePermission(PermissionEntity entity, Long createdById) {
        if (createdById != null && createdById.equals(currentUser.userId())) return true;
        Role role = currentRole();
        return role != null && role.getDeleteOtherPermissions().contains(entity);
    }

    public void requireView(PermissionEntity entity) {
        if (!hasViewPermission(entity)) {
            throw new ForbiddenOperationException("Tu rol no tiene permiso para ver " + entity + ".");
        }
    }

    public void requireCreate(PermissionEntity entity) {
        if (!hasCreatePermission(entity)) {
            throw new ForbiddenOperationException("Tu rol no tiene permiso para crear " + entity + ".");
        }
    }
}
