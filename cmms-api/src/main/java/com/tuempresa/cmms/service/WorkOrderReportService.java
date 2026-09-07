package com.tuempresa.cmms.service;

import com.itextpdf.kernel.colors.ColorConstants;
import com.itextpdf.kernel.pdf.PdfDocument;
import com.itextpdf.kernel.pdf.PdfWriter;
import com.itextpdf.layout.Document;
import com.itextpdf.layout.element.Cell;
import com.itextpdf.layout.element.Paragraph;
import com.itextpdf.layout.element.Table;
import com.itextpdf.layout.properties.UnitValue;
import com.tuempresa.cmms.exception.ResourceNotFoundException;
import com.tuempresa.cmms.model.entity.WorkOrder;
import com.tuempresa.cmms.model.entity.WorkOrderAdditionalCost;
import com.tuempresa.cmms.model.entity.WorkOrderPart;
import com.tuempresa.cmms.model.entity.WorkOrderTimeLog;
import com.tuempresa.cmms.repository.WorkOrderAdditionalCostRepository;
import com.tuempresa.cmms.repository.WorkOrderPartRepository;
import com.tuempresa.cmms.repository.WorkOrderRepository;
import com.tuempresa.cmms.repository.WorkOrderTimeLogRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.io.ByteArrayOutputStream;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.List;

/**
 * Genera el reporte PDF de una orden de trabajo, equivalente al
 * "SendReportModal"/"ReportConfigModal" de Atlas CMMS.
 */
@Service
@RequiredArgsConstructor
public class WorkOrderReportService {

    private static final DateTimeFormatter DATE_FORMAT =
            DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm").withZone(ZoneId.systemDefault());

    private final WorkOrderRepository workOrderRepository;
    private final WorkOrderTimeLogRepository timeLogRepository;
    private final WorkOrderAdditionalCostRepository costRepository;
    private final WorkOrderPartRepository partRepository;

    /** Sin configuracion: sale el reporte completo, igual que GET /report/{id} real. */
    @Transactional(readOnly = true)
    public byte[] generatePdf(Long workOrderId) {
        return generatePdf(workOrderId, com.tuempresa.cmms.dto.request.ReportConfig.defaults());
    }

    /**
     * Igual que generateReport real: la configuracion decide que secciones
     * incluir en el PDF (costos, comentarios, tareas, firma, etc.).
     */
    @Transactional(readOnly = true)
    public byte[] generatePdf(Long workOrderId, com.tuempresa.cmms.dto.request.ReportConfig config) {
        if (config == null) config = com.tuempresa.cmms.dto.request.ReportConfig.defaults();
        WorkOrder wo = workOrderRepository.findById(workOrderId)
                .orElseThrow(() -> new ResourceNotFoundException("Work order no encontrado: id=" + workOrderId));

        List<WorkOrderTimeLog> timeLogs = timeLogRepository.findByWorkOrderId(workOrderId);
        List<WorkOrderAdditionalCost> costs = costRepository.findByWorkOrderId(workOrderId);
        List<WorkOrderPart> parts = partRepository.findByWorkOrderId(workOrderId);

        ByteArrayOutputStream out = new ByteArrayOutputStream();
        try (PdfDocument pdfDoc = new PdfDocument(new PdfWriter(out));
             Document document = new Document(pdfDoc)) {

            document.add(new Paragraph("Orden de Trabajo WO" + String.format("%06d", wo.getId()))
                    .setBold().setFontSize(18));
            document.add(new Paragraph(wo.getTitle()).setFontSize(14).setMarginBottom(10));

            document.add(sectionTable(new String[][]{
                    {"Estado", wo.getStatus().name()},
                    {"Prioridad", wo.getPriority().name()},
                    {"Categoría", wo.getCategory() != null ? wo.getCategory().getName() : "—"},
                    {"Activo", wo.getAsset() != null ? wo.getAsset().getName() : "—"},
                    {"Ubicación", wo.getLocation() != null ? wo.getLocation().getName() : "—"},
                    {"Trabajador principal", wo.getPrimaryAssignee() != null ? fullName(wo.getPrimaryAssignee()) : "—"},
                    {"Creado por", wo.getCreatedBy() != null ? fullName(wo.getCreatedBy()) : "—"},
                    {"Fecha de vencimiento", wo.getDueDate() != null ? DATE_FORMAT.format(wo.getDueDate()) : "—"},
                    {"Fecha de creación", DATE_FORMAT.format(wo.getCreatedAt())},
                    {"Completado el", wo.getCompletedAt() != null ? DATE_FORMAT.format(wo.getCompletedAt()) : "—"},
            }));

            if (wo.getDescription() != null && !wo.getDescription().isBlank()) {
                document.add(new Paragraph("Descripción").setBold().setMarginTop(15));
                document.add(new Paragraph(wo.getDescription()));
            }

            double totalLabor = 0;
            if (config.showCost() && !timeLogs.isEmpty()) {
                document.add(new Paragraph("Tiempo registrado").setBold().setMarginTop(15));
                Table table = new Table(UnitValue.createPercentArray(new float[]{3, 2, 2}));
                table.setWidth(UnitValue.createPercentValue(100));
                addHeaderRow(table, "Técnico", "Horas", "Costo");
                for (WorkOrderTimeLog log : timeLogs) {
                    double cost = log.getHours() != null && log.getHourlyRateSnapshot() != null
                            ? log.getHours() * log.getHourlyRateSnapshot() : 0;
                    totalLabor += cost;
                    table.addCell(fullName(log.getUser()));
                    table.addCell(String.valueOf(log.getHours()));
                    table.addCell(String.format("$%.2f", cost));
                }
                document.add(table);
            }

            double totalAdditional = 0;
            if (config.showCost() && !costs.isEmpty()) {
                document.add(new Paragraph("Costos adicionales").setBold().setMarginTop(15));
                Table table = new Table(UnitValue.createPercentArray(new float[]{3, 2, 2}));
                table.setWidth(UnitValue.createPercentValue(100));
                addHeaderRow(table, "Descripción", "Categoría", "Costo");
                for (WorkOrderAdditionalCost cost : costs) {
                    totalAdditional += cost.getCost();
                    table.addCell(cost.getDescription());
                    table.addCell(cost.getCategory() != null ? cost.getCategory() : "—");
                    table.addCell(String.format("$%.2f", cost.getCost()));
                }
                document.add(table);
            }

            double totalParts = 0;
            if (config.showCost() && !parts.isEmpty()) {
                document.add(new Paragraph("Repuestos usados").setBold().setMarginTop(15));
                Table table = new Table(UnitValue.createPercentArray(new float[]{3, 1, 2, 2}));
                table.setWidth(UnitValue.createPercentValue(100));
                addHeaderRow(table, "Repuesto", "Cant.", "Costo unitario", "Total");
                for (WorkOrderPart part : parts) {
                    double unit = part.getUnitCostSnapshot() != null ? part.getUnitCostSnapshot() : 0;
                    double total = unit * part.getQuantityUsed();
                    totalParts += total;
                    table.addCell(part.getPart().getName());
                    table.addCell(String.valueOf(part.getQuantityUsed()));
                    table.addCell(String.format("$%.2f", unit));
                    table.addCell(String.format("$%.2f", total));
                }
                document.add(table);
            }

            document.add(new Paragraph(String.format("Costo total: $%.2f", totalLabor + totalAdditional + totalParts))
                    .setBold().setFontSize(13).setMarginTop(20));

        } catch (Exception e) {
            throw new RuntimeException("Error generando el PDF: " + e.getMessage(), e);
        }

        return out.toByteArray();
    }

    private void addHeaderRow(Table table, String... headers) {
        for (String h : headers) {
            table.addHeaderCell(new Cell().add(new Paragraph(h).setBold())
                    .setBackgroundColor(ColorConstants.LIGHT_GRAY));
        }
    }

    private Table sectionTable(String[][] rows) {
        Table table = new Table(UnitValue.createPercentArray(new float[]{1, 2}));
        table.setWidth(UnitValue.createPercentValue(100));
        for (String[] row : rows) {
            table.addCell(new Cell().add(new Paragraph(row[0]).setBold()).setBorder(null));
            table.addCell(new Cell().add(new Paragraph(row[1])).setBorder(null));
        }
        return table;
    }

    private String fullName(com.tuempresa.cmms.model.entity.User u) {
        String first = u.getFirstName() != null ? u.getFirstName() : "";
        String last = u.getLastName() != null ? u.getLastName() : "";
        return (first + " " + last).trim();
    }
}
