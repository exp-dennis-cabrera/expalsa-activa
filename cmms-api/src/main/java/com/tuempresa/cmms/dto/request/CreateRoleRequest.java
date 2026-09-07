package com.tuempresa.cmms.dto.request;

import com.tuempresa.cmms.model.enums.PermissionEntity;
import jakarta.validation.constraints.NotBlank;

import java.util.Set;

public record CreateRoleRequest(
        @NotBlank String name,
        String description,
        Set<PermissionEntity> createPermissions,
        Set<PermissionEntity> viewPermissions,
        Set<PermissionEntity> viewOtherPermissions,
        Set<PermissionEntity> editOtherPermissions,
        Set<PermissionEntity> deleteOtherPermissions
) {
}
