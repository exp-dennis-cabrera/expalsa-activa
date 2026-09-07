package com.tuempresa.cmms.dto.request;

import jakarta.validation.constraints.NotBlank;

import java.util.Set;

public record CreatePartRequest(
        @NotBlank String name,
        String erpSku,
        Integer quantity,
        Integer minQuantity,
        Double cost,
        Long locationId,
        Set<Long> assignedUserIds
) {
}
