package com.tuempresa.cmms.dto.response;

public record AssetAnalyticsResponse(
        double mtbfHours,
        double mttrHours,
        double downtimeHours,
        double uptimeHours,
        double totalCost
) {
}
