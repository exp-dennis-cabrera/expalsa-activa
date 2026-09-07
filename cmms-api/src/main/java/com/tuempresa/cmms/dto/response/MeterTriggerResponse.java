package com.tuempresa.cmms.dto.response;

import com.tuempresa.cmms.model.enums.MeterTriggerCondition;
import com.tuempresa.cmms.model.enums.WorkOrderPriority;

import java.time.Instant;

public record MeterTriggerResponse(
        Long id, String name, MeterTriggerCondition condition, Double value,
        String workOrderTitle, String workOrderDescription, WorkOrderPriority priority,
        Long primaryAssigneeId, String primaryAssigneeName, Integer waitBeforeDays,
        Long categoryId, String categoryName,
        Long locationId, String locationName,
        Long assetId, String assetName,
        Long teamId, String teamName,
        Instant dueDate, Instant estimatedStartDate, Integer estimatedDurationMinutes
) {
}
