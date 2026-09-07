package com.tuempresa.cmms.dto.request;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;

import java.time.LocalDate;

public record CreateTimeLogRequest(
        @NotNull @Positive Double hours,
        LocalDate logDate
) {
}
