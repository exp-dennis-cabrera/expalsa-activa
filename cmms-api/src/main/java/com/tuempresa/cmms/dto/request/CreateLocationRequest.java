package com.tuempresa.cmms.dto.request;

import jakarta.validation.constraints.NotBlank;

import java.util.Set;

public record CreateLocationRequest(
        @NotBlank(message = "El nombre es obligatorio")
        String name,
        String address,
        Double latitude,
        Double longitude,
        String imageUrl,
        Long parentLocationId,
        Set<Long> assignedUserIds,
        Set<Long> vendorIds,
        Set<Long> teamIds
) {
}
