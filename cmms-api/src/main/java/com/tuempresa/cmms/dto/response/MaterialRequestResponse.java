package com.tuempresa.cmms.dto.response;

import com.tuempresa.cmms.model.enums.MaterialRequestStatus;

import java.time.Instant;
import java.util.List;

public record MaterialRequestResponse(
        Long id,
        Long workOrderId,
        Long requestedById,
        String requestedByName,
        MaterialRequestStatus status,
        String notes,
        String erpRequestId,
        String rejectionReason,
        String decidedByErp,
        Instant decidedAt,
        List<ItemResponse> items,
        Instant createdAt
) {
    public record ItemResponse(Long id, Long partId, String partName, String partErpSku, Integer requestedQuantity, Integer approvedQuantity) {
    }
}
