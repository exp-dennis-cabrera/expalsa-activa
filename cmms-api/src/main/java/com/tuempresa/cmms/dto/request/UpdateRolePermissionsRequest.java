package com.tuempresa.cmms.dto.request;

import com.tuempresa.cmms.model.enums.PermissionEntity;

import java.util.Set;

public record UpdateRolePermissionsRequest(
        Set<PermissionEntity> createPermissions,
        Set<PermissionEntity> viewPermissions,
        Set<PermissionEntity> viewOtherPermissions,
        Set<PermissionEntity> editOtherPermissions,
        Set<PermissionEntity> deleteOtherPermissions
) {
}
