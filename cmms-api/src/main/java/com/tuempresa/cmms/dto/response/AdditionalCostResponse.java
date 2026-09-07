package com.tuempresa.cmms.dto.response;

import java.time.Instant;

public record AdditionalCostResponse(
        Long id,
        String description,
        Double cost,
        String category,
        Long createdById,
        String createdByName,
        Instant createdAt
) {
}
