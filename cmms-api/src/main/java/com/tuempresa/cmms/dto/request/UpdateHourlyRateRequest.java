package com.tuempresa.cmms.dto.request;

import jakarta.validation.constraints.PositiveOrZero;

public record UpdateHourlyRateRequest(@PositiveOrZero Double hourlyRate) {
}
