package com.tuempresa.cmms.dto.request;

import java.util.Set;

/**
 * Copia fiel de TeamPatchDTO real: al actualizar un equipo solo se pueden
 * cambiar nombre, descripción y miembros -- los activos y ubicaciones
 * asociadas solo se definen al CREAR el equipo (CreateTeamRequest), no se
 * pueden cambiar después desde este endpoint.
 */
public record UpdateTeamRequest(
        String name,
        String description,
        Set<Long> userIds
) {
}
