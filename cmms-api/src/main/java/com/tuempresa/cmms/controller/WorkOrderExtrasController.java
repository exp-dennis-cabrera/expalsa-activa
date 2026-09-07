package com.tuempresa.cmms.controller;

import com.tuempresa.cmms.dto.request.AddWorkOrderPartRequest;
import com.tuempresa.cmms.dto.request.CreateAdditionalCostRequest;
import com.tuempresa.cmms.dto.request.CreateCommentRequest;
import com.tuempresa.cmms.dto.request.CreateTimeLogRequest;
import com.tuempresa.cmms.dto.request.CreateWorkOrderLinkRequest;
import com.tuempresa.cmms.dto.response.AdditionalCostResponse;
import com.tuempresa.cmms.dto.response.CommentResponse;
import com.tuempresa.cmms.dto.response.FileResponse;
import com.tuempresa.cmms.dto.response.TimeLogResponse;
import com.tuempresa.cmms.dto.response.WorkOrderLinkResponse;
import com.tuempresa.cmms.dto.response.WorkOrderPartResponse;
import com.tuempresa.cmms.service.FileAttachmentService;
import com.tuempresa.cmms.service.WorkOrderAdditionalCostService;
import com.tuempresa.cmms.service.WorkOrderService;
import com.tuempresa.cmms.service.WorkOrderCommentService;
import com.tuempresa.cmms.service.WorkOrderLinkService;
import com.tuempresa.cmms.service.WorkOrderPartService;
import com.tuempresa.cmms.service.WorkOrderReportService;
import com.tuempresa.cmms.service.WorkOrderTimeLogService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;

/**
 * Sub-recursos de una orden de trabajo: tiempo registrado, costos adicionales,
 * repuestos usados, archivos adjuntos, comentarios, vinculos entre ordenes y
 * reporte PDF -- el set completo de secciones que vimos en el drawer real de Atlas.
 */
@RestController
@RequestMapping("/work-orders/{workOrderId}")
@RequiredArgsConstructor
public class WorkOrderExtrasController {

    /** Para validar acceso a la orden antes de tocar cualquier subrecurso. */
    private final WorkOrderService workOrderService;
    private final WorkOrderTimeLogService timeLogService;
    private final WorkOrderAdditionalCostService costService;
    private final WorkOrderPartService partService;
    private final FileAttachmentService fileAttachmentService;
    private final WorkOrderCommentService commentService;
    private final WorkOrderLinkService linkService;
    private final WorkOrderReportService reportService;

    @GetMapping("/time-logs")
    public List<TimeLogResponse> listTimeLogs(@PathVariable Long workOrderId) {
        workOrderService.requireAccess(workOrderId);
        return timeLogService.list(workOrderId);
    }

    @PostMapping("/time-logs")
    @ResponseStatus(HttpStatus.CREATED)
    public TimeLogResponse addTimeLog(@PathVariable Long workOrderId, @Valid @RequestBody CreateTimeLogRequest request) {
        workOrderService.requireAccess(workOrderId);
        return timeLogService.create(workOrderId, request);
    }

    @PostMapping("/timer/start")
    public TimeLogResponse startTimer(@PathVariable Long workOrderId) {
        workOrderService.requireAccess(workOrderId);
        return timeLogService.startTimer(workOrderId);
    }

    @PostMapping("/timer/stop")
    public TimeLogResponse stopTimer(@PathVariable Long workOrderId) {
        workOrderService.requireAccess(workOrderId);
        return timeLogService.stopTimer(workOrderId);
    }

    /** Igual que editLabor real: corregir las horas de un registro de tiempo. */
    @PatchMapping("/time-logs/{logId}")
    public com.tuempresa.cmms.dto.response.TimeLogResponse updateTimeLog(
            @PathVariable Long workOrderId, @PathVariable Long logId,
            @RequestBody UpdateTimeLogRequest request) {
        workOrderService.requireAccess(workOrderId);
        return timeLogService.updateHours(logId, request.hours());
    }

    public record UpdateTimeLogRequest(Double hours) {
    }

    @DeleteMapping("/time-logs/{logId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteTimeLog(@PathVariable Long workOrderId, @PathVariable Long logId) {
        workOrderService.requireAccess(workOrderId);
        timeLogService.delete(logId);
    }

    @GetMapping("/costs")
    public List<AdditionalCostResponse> listCosts(@PathVariable Long workOrderId) {
        workOrderService.requireAccess(workOrderId);
        return costService.list(workOrderId);
    }

    @PostMapping("/costs")
    @ResponseStatus(HttpStatus.CREATED)
    public AdditionalCostResponse addCost(@PathVariable Long workOrderId, @Valid @RequestBody CreateAdditionalCostRequest request) {
        workOrderService.requireAccess(workOrderId);
        return costService.create(workOrderId, request);
    }

    @DeleteMapping("/costs/{costId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteCost(@PathVariable Long workOrderId, @PathVariable Long costId) {
        workOrderService.requireAccess(workOrderId);
        costService.delete(costId);
    }

    @GetMapping("/parts")
    public List<WorkOrderPartResponse> listParts(@PathVariable Long workOrderId) {
        workOrderService.requireAccess(workOrderId);
        return partService.list(workOrderId);
    }

    @PostMapping("/parts")
    @ResponseStatus(HttpStatus.CREATED)
    public WorkOrderPartResponse addPart(@PathVariable Long workOrderId, @Valid @RequestBody AddWorkOrderPartRequest request) {
        workOrderService.requireAccess(workOrderId);
        return partService.addPart(workOrderId, request);
    }

    @DeleteMapping("/parts/{workOrderPartId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void removePart(@PathVariable Long workOrderId, @PathVariable Long workOrderPartId) {
        workOrderService.requireAccess(workOrderId);
        partService.removePart(workOrderPartId);
    }

    @GetMapping("/files")
    public List<FileResponse> listFiles(@PathVariable Long workOrderId) {
        workOrderService.requireAccess(workOrderId);
        return fileAttachmentService.list(workOrderId);
    }

    @PostMapping(value = "/files", consumes = "multipart/form-data")
    @ResponseStatus(HttpStatus.CREATED)
    public FileResponse uploadFile(@PathVariable Long workOrderId, @RequestParam("file") MultipartFile file) {
        return fileAttachmentService.upload(workOrderId, file);
    }

    @DeleteMapping("/files/{fileId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteFile(@PathVariable Long workOrderId, @PathVariable Long fileId) {
        workOrderService.requireAccess(workOrderId);
        fileAttachmentService.delete(fileId);
    }

    @GetMapping("/comments")
    public List<CommentResponse> listComments(@PathVariable Long workOrderId) {
        workOrderService.requireAccess(workOrderId);
        return commentService.list(workOrderId);
    }

    @PostMapping("/comments")
    @ResponseStatus(HttpStatus.CREATED)
    public CommentResponse addComment(@PathVariable Long workOrderId, @Valid @RequestBody CreateCommentRequest request) {
        workOrderService.requireAccess(workOrderId);
        return commentService.create(workOrderId, request);
    }

    @DeleteMapping("/comments/{commentId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteComment(@PathVariable Long workOrderId, @PathVariable Long commentId) {
        workOrderService.requireAccess(workOrderId);
        commentService.delete(commentId);
    }

    @GetMapping("/links")
    public List<WorkOrderLinkResponse> listLinks(@PathVariable Long workOrderId) {
        workOrderService.requireAccess(workOrderId);
        return linkService.list(workOrderId);
    }

    @PostMapping("/links")
    @ResponseStatus(HttpStatus.CREATED)
    public WorkOrderLinkResponse addLink(@PathVariable Long workOrderId, @Valid @RequestBody CreateWorkOrderLinkRequest request) {
        workOrderService.requireAccess(workOrderId);
        return linkService.addLink(workOrderId, request);
    }

    @DeleteMapping("/links/{linkId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void removeLink(@PathVariable Long workOrderId, @PathVariable Long linkId) {
        workOrderService.requireAccess(workOrderId);
        linkService.removeLink(linkId);
    }

    @GetMapping("/report")
    public ResponseEntity<byte[]> downloadReport(@PathVariable Long workOrderId) {
        workOrderService.requireAccess(workOrderId);
        byte[] pdf = reportService.generatePdf(workOrderId);
        return ResponseEntity.ok()
                .contentType(MediaType.APPLICATION_PDF)
                .header(HttpHeaders.CONTENT_DISPOSITION,
                        "attachment; filename=\"work-order-" + workOrderId + ".pdf\"")
                .body(pdf);
    }
}
