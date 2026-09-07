package com.tuempresa.cmms.dto.request;

/**
 * Igual que UserPatchDTO real: NO incluye el rol -- cambiar el rol de
 * alguien es una accion mas sensible (podria auto-asignarse Admin), asi
 * que vive en su propio endpoint (PATCH /users/{id}/role) con su propio
 * chequeo de permiso (editOtherPermissions), separado de "editar mi
 * propio perfil" (que cualquiera puede hacer).
 */
public record UpdateUserRequest(
        String firstName,
        String lastName,
        String phone,
        String jobTitle,
        Double hourlyRate
) {
}
