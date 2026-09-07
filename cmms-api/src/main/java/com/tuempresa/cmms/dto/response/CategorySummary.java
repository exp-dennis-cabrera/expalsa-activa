package com.tuempresa.cmms.dto.response;

public record CategorySummary(Long id, String name, String description, String type,
        /** Categoria padre, si esta es una variante. Null si es de primer nivel. */
        Long parentId, String parentName) {
}
