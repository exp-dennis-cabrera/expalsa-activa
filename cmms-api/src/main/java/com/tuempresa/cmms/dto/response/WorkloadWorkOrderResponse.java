package com.tuempresa.cmms.dto.response;

import com.tuempresa.cmms.model.enums.WorkOrderStatus;

import java.time.Instant;

public record WorkloadWorkOrderResponse(
        Long id,
        String title,
        WorkOrderStatus status,
        Double estimatedDurationHours,
        Instant estimatedStartDate,
        Instant dueDate
) {
}
