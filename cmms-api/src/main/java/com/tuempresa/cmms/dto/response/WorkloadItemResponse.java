package com.tuempresa.cmms.dto.response;

public record WorkloadItemResponse(
        Long id,
        String title,
        Integer estimatedDurationMinutes,
        Long primaryAssigneeId,
        String primaryAssigneeName,
        String estimatedStartDate // solo fecha (yyyy-MM-dd) o null si no esta programada
) {
}
