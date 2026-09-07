package com.tuempresa.cmms.dto.request;

import java.time.LocalDate;

public record ScheduleWorkloadRequest(
        LocalDate localDate,
        Long primaryUserId,
        Double estimatedDurationHours
) {
}
