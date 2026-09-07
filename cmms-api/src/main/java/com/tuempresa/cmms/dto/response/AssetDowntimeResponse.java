package com.tuempresa.cmms.dto.response;

import java.time.Instant;

public record AssetDowntimeResponse(Long id, Instant startsOn, Instant endsOn, Long durationSeconds) {
}
