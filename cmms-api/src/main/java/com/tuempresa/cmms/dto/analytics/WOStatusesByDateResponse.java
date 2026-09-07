package com.tuempresa.cmms.dto.analytics;

import java.time.Instant;

public record WOStatusesByDateResponse(Instant date, int open, int onHold, int inProgress, int complete) {
}
