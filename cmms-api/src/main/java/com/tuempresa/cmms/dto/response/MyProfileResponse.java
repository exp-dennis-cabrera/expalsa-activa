package com.tuempresa.cmms.dto.response;

/**
 * Igual estructura que UserResponseDTO real: el rol viene anidado como
 * objeto completo (role.createPermissions, role.viewPermissions, etc.),
 * no aplanado en el nivel superior.
 */
public record MyProfileResponse(
        Long id, String firstName, String lastName, String email,
        String phone, String jobTitle, String avatarUrl, Boolean mfaEnabled,
        RoleResponse role
) {
}
