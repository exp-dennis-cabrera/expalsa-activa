package com.tuempresa.cmms.dto.response;

import com.tuempresa.cmms.model.enums.RecurrenceBasedOn;
import com.tuempresa.cmms.model.enums.RecurrenceType;

import java.time.Instant;
import java.util.List;

public record ScheduleResponse(
        Boolean disabled,
        Instant startsOn,
        Integer frequency,
        Instant endsOn,
        Integer dueDateDelay,
        RecurrenceType recurrenceType,
        RecurrenceBasedOn recurrenceBasedOn,
        List<Integer> daysOfWeek
) {
}
