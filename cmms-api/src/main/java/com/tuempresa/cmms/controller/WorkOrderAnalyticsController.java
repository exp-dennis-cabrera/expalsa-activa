package com.tuempresa.cmms.controller;

import com.tuempresa.cmms.dto.analytics.*;
import com.tuempresa.cmms.service.WorkOrderAnalyticsService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/analytics/work-orders")
@RequiredArgsConstructor
public class WorkOrderAnalyticsController {

    private final WorkOrderAnalyticsService workOrderAnalyticsService;

    @PostMapping("/overview")
    public WOStatsResponse getOverview(@RequestBody DateRangeRequest range) {
        return workOrderAnalyticsService.getOverview(range);
    }

    @PostMapping("/statuses")
    public WOStatusesResponse getStatuses(@RequestBody DateRangeRequest range) {
        return workOrderAnalyticsService.getStatuses(range);
    }

    @PostMapping("/incomplete-overview")
    public WOIncompleteStatsResponse getIncompleteOverview(@RequestBody DateRangeRequest range) {
        return workOrderAnalyticsService.getIncompleteOverview(range);
    }

    @PostMapping("/incomplete-by-priority")
    public WOStatsByPriorityResponse getIncompleteByPriority(@RequestBody DateRangeRequest range) {
        return workOrderAnalyticsService.getIncompleteByPriority(range);
    }

    @PostMapping("/statuses-by-date")
    public List<WOStatusesByDateResponse> getStatusesByDate(@RequestBody DateRangeRequest range) {
        return workOrderAnalyticsService.getStatusesByDate(range);
    }

    @PostMapping("/hours")
    public WOHoursResponse getHours(@RequestBody DateRangeRequest range) {
        return workOrderAnalyticsService.getHours(range);
    }
}
