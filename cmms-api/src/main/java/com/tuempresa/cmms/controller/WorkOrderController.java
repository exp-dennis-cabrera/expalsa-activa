package com.tuempresa.cmms.controller;

import com.tuempresa.cmms.dto.request.CreateWorkOrderRequest;
import com.tuempresa.cmms.dto.request.UpdateWorkOrderRequest;
import com.tuempresa.cmms.dto.request.UpdateWorkOrderStatusRequest;
import com.tuempresa.cmms.dto.response.CalendarEventResponse;
import com.tuempresa.cmms.dto.response.PageResponse;
import com.tuempresa.cmms.dto.response.WorkOrderResponse;
import com.tuempresa.cmms.model.enums.WorkOrderPriority;
import com.tuempresa.cmms.model.enums.WorkOrderStatus;
import com.tuempresa.cmms.repository.WorkOrderRepository;
import com.tuempresa.cmms.service.WorkOrderContractorMailService;
import com.tuempresa.cmms.service.WorkOrderService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springdoc.core.annotations.ParameterObject;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import java.time.Instant;
import java.util.List;

@RestController
@RequestMapping("/work-orders")
@RequiredArgsConstructor
public class WorkOrderController {

    private final WorkOrderService workOrderService;
    private final com.tuempresa.cmms.service.WorkOrderReportService reportService;
    private final WorkOrderRepository workOrderRepository;
    private final WorkOrderContractorMailService contractorMailService;

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public WorkOrderResponse create(@Valid @RequestBody CreateWorkOrderRequest request) {
        return workOrderService.create(request);
    }

    @GetMapping("/{id:\\d+}")
    public WorkOrderResponse getById(@PathVariable Long id) {
        return workOrderService.getById(id);
    }

    @GetMapping
    public PageResponse<WorkOrderResponse> list(
            @RequestParam(required = false) List<WorkOrderStatus> status,
            @RequestParam(required = false) List<WorkOrderPriority> priority,
            @RequestParam(required = false) Long assetId,
            @RequestParam(required = false) String search,
            @RequestParam(required = false) Long assignedToUserId,
            @ParameterObject @PageableDefault(size = 20, sort = "createdAt", direction = Sort.Direction.DESC) Pageable pageable) {
        return PageResponse.from(workOrderService.list(status, priority, assetId, search, assignedToUserId, pageable));
    }

    /**
     * Copia fiel de POST /work-orders/search real.
     *
     * Recibe SearchCriteria (filtros genericos con operadores) en vez de
     * filtros con nombre fijo. Reemplaza al endpoint anterior, que usaba
     * WorkOrderAdvancedFilterRequest -- la app movil tambien se adapto a
     * este formato.
     */
    /** Igual que export_work_orders del menu real. */
    @GetMapping("/export")
    public org.springframework.http.ResponseEntity<byte[]> export() {
        return com.tuempresa.cmms.util.CsvResponse.of(
                workOrderService.exportWorkOrdersCsv(), "ordenes-de-trabajo.csv");
    }

    /** Igual que export_cost_and_time del menu real. */
    @GetMapping("/export/costs-times")
    public org.springframework.http.ResponseEntity<byte[]> exportCostsAndTimes() {
        return com.tuempresa.cmms.util.CsvResponse.of(
                workOrderService.exportCostsAndTimesCsv(), "costos-y-tiempos.csv");
    }

    @PostMapping("/search")
    public PageResponse<WorkOrderResponse> search(
            @RequestBody com.tuempresa.cmms.advancedsearch.SearchCriteria searchCriteria) {
        return PageResponse.from(workOrderService.findBySearchCriteria(searchCriteria));
    }

    /**
     * Igual que GET /work-orders/urgent real: cuantas ordenes vencen en los
     * proximos 2 dias y todavia no estan completadas. Alimenta la insignia
     * roja del menu lateral.
     */
    /**
     * Igual que GET /work-orders/report/{id} real: descarga el PDF de la
     * orden con todas las secciones.
     */
    @GetMapping("/report/{id}")
    public org.springframework.http.ResponseEntity<byte[]> getReport(@PathVariable Long id) {
        byte[] pdf = reportService.generatePdf(id);
        return org.springframework.http.ResponseEntity.ok()
                .header("Content-Disposition", "attachment; filename=orden-" + id + ".pdf")
                .header("Content-Type", "application/pdf")
                .body(pdf);
    }

    /**
     * Igual que POST /work-orders/report/{id} real: mismo PDF, pero
     * eligiendo que secciones incluir (costos, comentarios, firma, etc.).
     */
    @PostMapping("/report/{id}")
    public org.springframework.http.ResponseEntity<byte[]> getReportWithConfig(
            @PathVariable Long id,
            @RequestBody(required = false) com.tuempresa.cmms.dto.request.ReportConfig config) {
        byte[] pdf = reportService.generatePdf(id, config);
        return org.springframework.http.ResponseEntity.ok()
                .header("Content-Disposition", "attachment; filename=orden-" + id + ".pdf")
                .header("Content-Type", "application/pdf")
                .body(pdf);
    }

    /** Igual que GET /work-order-histories/work-order/{id} real. */
    @GetMapping("/{id:\\d+}/history")
    public List<com.tuempresa.cmms.dto.response.WorkOrderHistoryResponse> history(@PathVariable Long id) {
        return workOrderService.getHistory(id);
    }

    @GetMapping("/urgent")
    public java.util.Map<String, Long> urgentCount() {
        return java.util.Map.of("count", workOrderService.countUrgent());
    }

    /** Igual que GET /work-orders/asset/{id} real: ordenes de un activo. */
    @GetMapping("/asset/{id}")
    public List<WorkOrderResponse> byAsset(@PathVariable Long id) {
        return workOrderService.findByAsset(id);
    }

    /** Igual que GET /work-orders/location/{id} real: ordenes de una ubicacion. */
    @GetMapping("/location/{id}")
    public List<WorkOrderResponse> byLocation(@PathVariable Long id) {
        return workOrderService.findByLocation(id);
    }

    /** Igual verbo que el real (PATCH). Se mantiene PUT por compatibilidad con clientes ya desplegados. */
    @PatchMapping("/{id:\\d+}")
    public WorkOrderResponse patch(@PathVariable Long id, @Valid @RequestBody UpdateWorkOrderRequest request) {
        return workOrderService.update(id, request);
    }

    @PutMapping("/{id:\\d+}")
    public WorkOrderResponse update(@PathVariable Long id, @Valid @RequestBody UpdateWorkOrderRequest request) {
        return workOrderService.update(id, request);
    }

    /** Igual ruta que el real. Se mantiene /status por compatibilidad. */
    @PatchMapping("/{id}/change-status")
    public WorkOrderResponse changeStatus(@PathVariable Long id,
                                           @Valid @RequestBody UpdateWorkOrderStatusRequest request) {
        return workOrderService.updateStatus(id, request);
    }

    @PatchMapping("/{id}/status")
    public WorkOrderResponse updateStatus(@PathVariable Long id,
                                           @Valid @RequestBody UpdateWorkOrderStatusRequest request) {
        return workOrderService.updateStatus(id, request);
    }

    @DeleteMapping("/{id:\\d+}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable Long id) {
        workOrderService.delete(id);
    }

    @PatchMapping("/{id}/archive")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void archive(@PathVariable Long id) {
        workOrderService.archive(id);
    }

    @PostMapping("/{id}/copy")
    @ResponseStatus(HttpStatus.CREATED)
    public WorkOrderResponse copy(@PathVariable Long id) {
        return workOrderService.copy(id);
    }

    @PostMapping("/{id}/email-contractor")
    public void emailContractor(@PathVariable Long id) {
        contractorMailService.sendToContractor(id);
    }

    /**
     * Equivalente a POST /work-orders/events real de Atlas (aqui como GET
     * por simplicidad): devuelve las ordenes cuya fecha de vencimiento cae
     * dentro del rango visible del calendario.
     */
    @GetMapping("/calendar")
    public List<CalendarEventResponse> calendar(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) Instant start,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) Instant end) {
        return workOrderRepository.findByDueDateBetween(start, end).stream()
                .map(wo -> new CalendarEventResponse(wo.getId(), wo.getTitle(), wo.getDueDate(), wo.getStatus(), wo.getPriority()))
                .toList();
    }
}
