package com.tuempresa.cmms.dto.response;

import com.tuempresa.cmms.model.enums.WorkOrderPriority;

import java.time.Instant;

public record PreventiveMaintenanceResponse(
        Long id,
        String customId,
        String name,
        String title,
        String description,
        WorkOrderPriority priority,
        Long categoryId,
        String categoryName,
        Long assetId,
        String assetName,
        Long locationId,
        String locationName,
        Long teamId,
        String teamName,
        Long primaryAssigneeId,
        String primaryAssigneeName,
        Integer estimatedDurationMinutes,
        Integer daysBeforeNotification,
        ScheduleResponse schedule,
        Instant lastGeneratedAt,
        Instant nextDueAt,
        Instant createdAt
) {
}
