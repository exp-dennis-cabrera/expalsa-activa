package com.tuempresa.cmms.dto.response;

import java.time.Instant;
import java.time.LocalDate;

public record TimeLogResponse(
        Long id,
        Long userId,
        String userName,
        Double hours,
        LocalDate logDate,
        Double cost,
        boolean running,
        Instant startedAt,
        Instant createdAt
) {
}
