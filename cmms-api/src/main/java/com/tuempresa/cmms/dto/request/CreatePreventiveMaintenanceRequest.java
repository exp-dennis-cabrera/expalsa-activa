package com.tuempresa.cmms.dto.request;

import com.tuempresa.cmms.model.enums.WorkOrderPriority;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public record CreatePreventiveMaintenanceRequest(
        @NotBlank String name,
        @NotBlank String title,
        String description,
        WorkOrderPriority priority,
        Long categoryId,
        Long assetId,
        Long locationId,
        Long teamId,
        Long primaryAssigneeId,
        Integer estimatedDurationMinutes,
        Integer daysBeforeNotification,
        @NotNull @Valid ScheduleInput schedule
) {
}
