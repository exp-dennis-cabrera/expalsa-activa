package com.tuempresa.cmms.dto.response;

import java.time.LocalDate;
import java.util.List;

public record WorkloadDayResponse(
        LocalDate date,
        String dayOfWeek,
        int teamCapacityMinutes,
        double teamAllocatedMinutes,
        List<WorkloadUserDayResponse> users
) {
}
