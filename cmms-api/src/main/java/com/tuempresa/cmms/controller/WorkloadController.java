package com.tuempresa.cmms.controller;

import com.tuempresa.cmms.dto.request.ScheduleWorkloadRequest;
import com.tuempresa.cmms.dto.request.UpdateShiftRequest;
import com.tuempresa.cmms.dto.response.ShiftDayResponse;
import com.tuempresa.cmms.dto.response.UnscheduledWorkOrdersResponse;
import com.tuempresa.cmms.dto.response.WorkOrderResponse;
import com.tuempresa.cmms.dto.response.WorkloadOverviewResponse;
import com.tuempresa.cmms.service.WorkloadService;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;

/**
 * Mismo namespace y forma que el WorkloadController real de Atlas
 * (GET /workload/overview, GET /workload/unscheduled,
 * PATCH /workload/work-orders/{id}/schedule) -- sin el bloqueo de licencia
 * de pago, ya que nuestra app es autoalojada.
 */
@RestController
@RequestMapping("/workload")
@RequiredArgsConstructor
public class WorkloadController {

    private final WorkloadService workloadService;

    @GetMapping("/overview")
    public WorkloadOverviewResponse getOverview(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate,
            @RequestParam(required = false) List<Long> userIds) {
        return workloadService.getOverview(startDate, endDate, userIds);
    }

    @GetMapping("/unscheduled")
    public UnscheduledWorkOrdersResponse getUnscheduled() {
        return workloadService.getUnscheduled();
    }

    @PatchMapping("/work-orders/{id}/schedule")
    public WorkOrderResponse scheduleWorkOrder(@PathVariable Long id, @RequestBody ScheduleWorkloadRequest request) {
        return workloadService.scheduleWorkOrder(id, request);
    }

    @GetMapping("/shifts/{userId}")
    public List<ShiftDayResponse> getShift(@PathVariable Long userId) {
        return workloadService.getShift(userId);
    }

    @PutMapping("/shifts/{userId}")
    public List<ShiftDayResponse> updateShift(@PathVariable Long userId, @RequestBody UpdateShiftRequest request) {
        return workloadService.updateShift(userId, request.days());
    }

    /** Excepciones de turno: vacaciones, feriados, media jornada. */
    @GetMapping("/shifts/{userId}/exceptions")
    public List<com.tuempresa.cmms.dto.response.ShiftExceptionResponse> getExceptions(@PathVariable Long userId) {
        return workloadService.getShiftExceptions(userId);
    }

    @PostMapping("/shifts/{userId}/exceptions")
    public com.tuempresa.cmms.dto.response.ShiftExceptionResponse saveException(
            @PathVariable Long userId,
            @jakarta.validation.Valid @RequestBody com.tuempresa.cmms.dto.request.ShiftExceptionRequest request) {
        return workloadService.saveShiftException(userId, request);
    }

    @DeleteMapping("/shifts/exceptions/{exceptionId}")
    @org.springframework.web.bind.annotation.ResponseStatus(org.springframework.http.HttpStatus.NO_CONTENT)
    public void deleteException(@PathVariable Long exceptionId) {
        workloadService.deleteShiftException(exceptionId);
    }
}
