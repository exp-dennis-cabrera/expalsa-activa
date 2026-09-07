package com.tuempresa.cmms.dto.response;

import java.util.List;

/** Copia fiel de TeamMiniDTO real: id, nombre y sus miembros, para selectores livianos. */
public record TeamMiniResponse(
        Long id,
        String name,
        List<UserSummary> users
) {
}
