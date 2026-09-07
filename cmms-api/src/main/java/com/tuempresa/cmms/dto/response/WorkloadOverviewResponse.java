package com.tuempresa.cmms.dto.response;

import java.time.LocalDate;
import java.util.List;

public record WorkloadOverviewResponse(
        LocalDate startDate,
        LocalDate endDate,
        int teamCapacityMinutes,
        double teamAllocatedMinutes,
        List<WorkloadDayResponse> days
) {
}
