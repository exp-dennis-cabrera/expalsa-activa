package com.tuempresa.cmms.dto.response;

public record MobileOverviewResponse(int open, int onHold, int inProgress, int complete, int today, int high) {
}
