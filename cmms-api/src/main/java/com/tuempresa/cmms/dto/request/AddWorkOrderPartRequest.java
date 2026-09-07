package com.tuempresa.cmms.dto.request;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;

public record AddWorkOrderPartRequest(
        @NotNull Long partId,
        @NotNull @Min(1) Integer quantityUsed
) {
}
