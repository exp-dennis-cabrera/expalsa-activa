package com.tuempresa.cmms.dto.request;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;

import java.util.List;

public record CreateMaterialRequestRequest(
        @NotNull Long workOrderId,
        String notes,
        @NotEmpty @Valid List<ItemInput> items
) {
    public record ItemInput(@NotNull Long partId, @NotNull Integer quantity) {
    }
}
