package com.tuempresa.cmms.dto.response;

import java.util.List;
import java.util.Map;

public record UnscheduledWorkOrdersResponse(
        Map<String, Long> statusCounts,
        int overdueCount,
        int dueSoonCount,
        List<WorkloadWorkOrderResponse> workOrders
) {
}
