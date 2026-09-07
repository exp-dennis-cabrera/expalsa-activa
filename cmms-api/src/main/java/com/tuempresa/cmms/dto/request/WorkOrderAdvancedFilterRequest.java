package com.tuempresa.cmms.dto.request;

import com.tuempresa.cmms.model.enums.WorkOrderPriority;
import com.tuempresa.cmms.model.enums.WorkOrderStatus;

import java.time.Instant;
import java.util.List;

/**
 * Mismo conjunto de campos que la pantalla WorkOrderFilters.tsx real,
 * salvo "customer" (no existe esa entidad en nuestra app) y el filtro de
 * "Reactiva/Repetitiva" (requeriria rastrear el origen PM->OT de forma
 * distinta a como lo hacemos hoy).
 */
public record WorkOrderAdvancedFilterRequest(
        List<WorkOrderStatus> status,
        List<WorkOrderPriority> priority,
        String search,
        Long assignedToUserId,
        List<Long> assetIds,
        List<Long> categoryIds,
        List<Long> teamIds,
        List<Long> locationIds,
        List<Long> primaryUserIds,
        List<Long> additionalWorkerIds,
        List<Long> createdByIds,
        List<Long> completedByIds,
        Boolean archived,
        Instant dueDateBefore,
        Instant createdAtFrom,
        Instant createdAtTo,
        Instant updatedAtFrom,
        Instant updatedAtTo,
        Instant completedAtFrom,
        Instant completedAtTo
) {
}
