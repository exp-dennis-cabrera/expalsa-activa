package com.tuempresa.cmms.dto.response;

import com.tuempresa.cmms.model.enums.WorkOrderPriority;
import com.tuempresa.cmms.model.enums.WorkOrderStatus;
import com.tuempresa.cmms.model.enums.WorkOrderType;

import java.time.Instant;
import java.util.Set;

public record WorkOrderResponse(
        Long id,
        String customId,
        String title,
        String imageUrl,
        String description,
        WorkOrderStatus status,
        WorkOrderPriority priority,
        WorkOrderType type,
        Long categoryId,
        String categoryName,
        Long assetId,
        String assetName,
        Long locationId,
        String locationName,
        String locationAddress,
        Long createdById,
        String createdByName,
        Long completedById,
        String completedByName,
        Long vendorId,
        String vendorName,
        Long teamId,
        String teamName,
        Long primaryAssigneeId,
        String primaryAssigneeName,
        Set<AssigneeSummary> assignees,
        Instant dueDate,
        Instant estimatedStartDate,
        Integer estimatedDurationMinutes,
        Boolean requiresSignature,
        String feedback,
        String signature,
        Instant completedAt,
        Boolean archived,
        Integer filesCount,
        String requestedByName,
        Instant createdAt,
        Instant updatedAt
) {
    public record AssigneeSummary(Long id, String fullName) {
    }
}
