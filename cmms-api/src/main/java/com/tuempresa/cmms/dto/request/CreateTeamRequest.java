package com.tuempresa.cmms.dto.request;

import jakarta.validation.constraints.NotBlank;

import java.util.Set;

public record CreateTeamRequest(
        @NotBlank String name,
        String description,
        Set<Long> userIds,
        Set<Long> assetIds,
        Set<Long> locationIds,
        Set<Long> partIds
) {
}
