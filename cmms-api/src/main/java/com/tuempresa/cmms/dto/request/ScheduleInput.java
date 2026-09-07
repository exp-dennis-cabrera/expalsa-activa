package com.tuempresa.cmms.dto.request;

import com.tuempresa.cmms.model.enums.RecurrenceBasedOn;
import com.tuempresa.cmms.model.enums.RecurrenceType;
import jakarta.validation.constraints.NotNull;

import java.time.Instant;
import java.util.List;

public record ScheduleInput(
        @NotNull Instant startsOn,
        @NotNull Integer frequency,
        Instant endsOn,
        Integer dueDateDelay,
        @NotNull RecurrenceType recurrenceType,
        @NotNull RecurrenceBasedOn recurrenceBasedOn,
        List<Integer> daysOfWeek
) {
}
