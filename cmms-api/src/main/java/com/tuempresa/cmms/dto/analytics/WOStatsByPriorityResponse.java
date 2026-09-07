package com.tuempresa.cmms.dto.analytics;

public record WOStatsByPriorityResponse(PriorityStats high, PriorityStats medium, PriorityStats low, PriorityStats none) {
    public record PriorityStats(int count, double estimatedHours) {
    }
}
