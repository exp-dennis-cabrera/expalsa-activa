package com.tuempresa.cmms.dto.response;

import java.time.Instant;

public record PmCalendarEventResponse(Long preventiveMaintenanceId, String title, Instant date) {
}
