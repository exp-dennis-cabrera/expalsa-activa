package com.tuempresa.cmms.controller;

import com.tuempresa.cmms.dto.request.CreatePreventiveMaintenanceRequest;
import com.tuempresa.cmms.dto.response.PreventiveMaintenanceResponse;
import com.tuempresa.cmms.dto.response.WorkOrderResponse;
import com.tuempresa.cmms.service.PreventiveMaintenanceService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/preventive-maintenances")
@RequiredArgsConstructor
public class PreventiveMaintenanceController {

    private final PreventiveMaintenanceService preventiveMaintenanceService;

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public PreventiveMaintenanceResponse create(@Valid @RequestBody CreatePreventiveMaintenanceRequest request) {
        return preventiveMaintenanceService.create(request);
    }

    @GetMapping
    public List<PreventiveMaintenanceResponse> list() {
        return preventiveMaintenanceService.list();
    }

    @GetMapping("/{id}")
    public PreventiveMaintenanceResponse getById(@PathVariable Long id) {
        return preventiveMaintenanceService.getById(id);
    }

    @PutMapping("/{id}")
    public PreventiveMaintenanceResponse update(@PathVariable Long id, @Valid @RequestBody CreatePreventiveMaintenanceRequest request) {
        return preventiveMaintenanceService.update(id, request);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable Long id) {
        preventiveMaintenanceService.delete(id);
    }

    @PatchMapping("/{id}/enabled")
    public PreventiveMaintenanceResponse setEnabled(@PathVariable Long id, @RequestBody java.util.Map<String, Boolean> body) {
        return preventiveMaintenanceService.toggleEnabled(id, Boolean.TRUE.equals(body.get("enabled")));
    }

    @GetMapping("/{id}/work-orders")
    public List<WorkOrderResponse> getWorkOrderHistory(@PathVariable Long id) {
        return preventiveMaintenanceService.getWorkOrderHistory(id);
    }

    @PostMapping("/{id}/generate-now")
    public WorkOrderResponse generateNow(@PathVariable Long id) {
        return preventiveMaintenanceService.generateNow(id);
    }

    @GetMapping("/calendar")
    public List<com.tuempresa.cmms.dto.response.PmCalendarEventResponse> calendar(
            @RequestParam @org.springframework.format.annotation.DateTimeFormat(iso = org.springframework.format.annotation.DateTimeFormat.ISO.DATE_TIME) java.time.Instant start,
            @RequestParam @org.springframework.format.annotation.DateTimeFormat(iso = org.springframework.format.annotation.DateTimeFormat.ISO.DATE_TIME) java.time.Instant end) {
        return preventiveMaintenanceService.getProjectedEvents(start, end);
    }

    @GetMapping("/export")
    public org.springframework.http.ResponseEntity<byte[]> export() {
        return com.tuempresa.cmms.util.CsvResponse.of(
                preventiveMaintenanceService.exportCsv(), "mantenimiento_preventivo.csv");
    }

    @PostMapping(value = "/import", consumes = "multipart/form-data")
    public java.util.Map<String, Integer> importCsv(@RequestParam("file") org.springframework.web.multipart.MultipartFile file) {
        return preventiveMaintenanceService.importCsv(file);
    }
}
