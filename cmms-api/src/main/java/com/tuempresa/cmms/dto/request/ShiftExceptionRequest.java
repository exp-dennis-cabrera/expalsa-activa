package com.tuempresa.cmms.dto.request;

import jakarta.validation.constraints.NotNull;

import java.time.LocalDate;

public record ShiftExceptionRequest(
        @NotNull LocalDate exceptionDate,
        Integer availabilityMinutes,
        Boolean enabled,
        String reason) {
}
