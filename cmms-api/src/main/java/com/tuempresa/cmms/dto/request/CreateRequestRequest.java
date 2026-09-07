package com.tuempresa.cmms.dto.request;

import com.tuempresa.cmms.model.enums.WorkOrderPriority;
import com.tuempresa.cmms.model.enums.WorkOrderType;
import jakarta.validation.constraints.NotBlank;

import java.time.Instant;

public record CreateRequestRequest(
        @NotBlank String title,
        String description,
        WorkOrderPriority priority,
        WorkOrderType type,
        Long categoryId,
        Long assetId,
        Long locationId,
        Long teamId,
        Instant dueDate,
        Integer estimatedDurationMinutes,
        Instant estimatedStartDate,
        String contact
) {
}
