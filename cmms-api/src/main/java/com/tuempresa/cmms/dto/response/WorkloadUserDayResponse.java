package com.tuempresa.cmms.dto.response;

import java.util.List;

public record WorkloadUserDayResponse(
        Long userId,
        String fullName,
        int capacityMinutes,
        double allocatedMinutes,
        List<WorkloadWorkOrderResponse> workOrders
) {
}
