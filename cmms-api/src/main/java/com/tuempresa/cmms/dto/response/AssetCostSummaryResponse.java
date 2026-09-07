package com.tuempresa.cmms.dto.response;

public record AssetCostSummaryResponse(
        double laborCost,
        double partsCost,
        double additionalCost,
        double totalCost,
        int workOrderCount,
        int completedWorkOrderCount
) {
}
