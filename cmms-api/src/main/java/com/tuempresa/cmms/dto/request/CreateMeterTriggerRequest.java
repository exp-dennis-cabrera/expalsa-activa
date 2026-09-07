package com.tuempresa.cmms.dto.request;

import com.tuempresa.cmms.model.enums.MeterTriggerCondition;
import com.tuempresa.cmms.model.enums.WorkOrderPriority;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.time.Instant;

public record CreateMeterTriggerRequest(
        @NotBlank String name,
        @NotNull MeterTriggerCondition condition,
        @NotNull Double value,
        @NotBlank String workOrderTitle,
        String workOrderDescription,
        WorkOrderPriority priority,
        Long primaryAssigneeId,
        Integer waitBeforeDays,
        Long categoryId,
        Long locationId,
        Long assetId,
        Long teamId,
        Instant dueDate,
        Instant estimatedStartDate,
        Integer estimatedDurationMinutes
) {
}
