package com.tuempresa.cmms.dto.response;

import com.tuempresa.cmms.model.enums.WorkOrderPriority;
import com.tuempresa.cmms.model.enums.WorkOrderStatus;

import java.time.Instant;

public record CalendarEventResponse(
        Long id,
        String title,
        Instant date,
        WorkOrderStatus status,
        WorkOrderPriority priority
) {
}
