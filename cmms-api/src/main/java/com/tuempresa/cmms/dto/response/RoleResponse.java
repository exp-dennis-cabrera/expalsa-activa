package com.tuempresa.cmms.dto.response;

import com.tuempresa.cmms.model.enums.PermissionEntity;

import java.util.Set;

public record RoleResponse(
        Long id,
        String name,
        String code,
        String description,
        Long usersCount,
        Set<PermissionEntity> createPermissions,
        Set<PermissionEntity> viewPermissions,
        Set<PermissionEntity> viewOtherPermissions,
        Set<PermissionEntity> editOtherPermissions,
        Set<PermissionEntity> deleteOtherPermissions
) {
}
