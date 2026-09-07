package com.tuempresa.cmms.dto.response;

import java.time.LocalTime;

public record ShiftDayResponse(
        String dayOfWeek,
        boolean enabled,
        LocalTime startTime,
        LocalTime endTime,
        int durationMinutes,
        boolean crossesMidnight
) {
}
