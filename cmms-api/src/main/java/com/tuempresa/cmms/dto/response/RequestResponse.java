package com.tuempresa.cmms.dto.response;

import com.tuempresa.cmms.model.enums.WorkOrderPriority;
import com.tuempresa.cmms.model.enums.WorkOrderType;

import java.time.Instant;

public record RequestResponse(
        Long id,
        String customId,
        String title,
        String description,
        WorkOrderPriority priority,
        WorkOrderType type,
        Long categoryId,
        String categoryName,
        Long assetId,
        String assetName,
        Long locationId,
        String locationName,
        Long teamId,
        String teamName,
        Instant dueDate,
        Integer estimatedDurationMinutes,
        Instant estimatedStartDate,
        Long createdById,
        String createdByName,
        String contact,
        String status, // PENDING | APPROVED | CANCELLED (derivado, no guardado)
        Boolean cancelled,
        String cancellationReason,
        Long workOrderId,
        Instant createdAt
) {
}
