package com.tuempresa.cmms.dto.request;

import jakarta.validation.constraints.NotBlank;

public record CreateCategoryRequest(
        @NotBlank String name,
        String description,
        String type
,
        /** Categoria padre. Opcional: null crea una de primer nivel. */
        Long parentId) {
}
