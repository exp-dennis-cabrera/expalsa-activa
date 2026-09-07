package com.tuempresa.cmms.dto.request;

import jakarta.validation.constraints.NotBlank;

public record CreateFloorPlanRequest(@NotBlank String name, Double area, String imageUrl) {
}
