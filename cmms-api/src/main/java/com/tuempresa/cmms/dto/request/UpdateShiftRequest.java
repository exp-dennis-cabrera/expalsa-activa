package com.tuempresa.cmms.dto.request;

import java.time.LocalTime;
import java.util.List;

public record UpdateShiftRequest(List<ShiftDayInput> days) {
    public record ShiftDayInput(String dayOfWeek, boolean enabled, LocalTime startTime, LocalTime endTime) {
    }
}
