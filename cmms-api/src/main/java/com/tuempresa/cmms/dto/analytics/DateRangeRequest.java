package com.tuempresa.cmms.dto.analytics;

import java.time.Instant;

public record DateRangeRequest(Instant start, Instant end) {
}
