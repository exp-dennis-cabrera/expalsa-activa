package com.tuempresa.cmms.dto.request;

import jakarta.validation.constraints.NotBlank;

public record CreateMeterRequest(@NotBlank String name, String unit, Integer updateFrequencyDays, Long categoryId, Long locationId, java.util.Set<Long> assignedUserIds,
        /** Equipo responsable. Opcional: sin equipo, lo ve todo el mundo. */
        Long teamId) {
}
