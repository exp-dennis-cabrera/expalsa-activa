package com.tuempresa.cmms.dto.analytics;

public record WOStatsResponse(int total, int complete, int compliant, long avgCycleTimeDays, long mttaHours) {
}
