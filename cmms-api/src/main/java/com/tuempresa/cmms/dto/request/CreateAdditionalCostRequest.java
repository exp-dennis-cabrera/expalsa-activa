package com.tuempresa.cmms.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.PositiveOrZero;

public record CreateAdditionalCostRequest(
        @NotBlank String description,
        @NotNull @PositiveOrZero Double cost,
        String category
) {
}
