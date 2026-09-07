package com.tuempresa.cmms.dto.response;

public record WorkOrderPartResponse(
        Long id,
        Long partId,
        String partName,
        Integer quantityUsed,
        Double unitCost,
        Double totalCost
) {
}
