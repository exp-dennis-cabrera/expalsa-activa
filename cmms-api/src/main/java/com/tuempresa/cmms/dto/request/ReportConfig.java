package com.tuempresa.cmms.dto.request;

/**
 * Copia fiel de ReportConfig real: define que secciones incluir en el PDF
 * de la orden de trabajo. Todas vienen activadas por defecto -- si el
 * cliente no manda nada, el reporte sale completo.
 */
public record ReportConfig(
        Boolean cost,
        Boolean comments,
        Boolean tasks,
        Boolean workOrderHistory,
        Boolean estimatedTime,
        Boolean locationAddress,
        Boolean priority,
        Boolean workOrderInformation,
        Boolean relations,
        Boolean files,
        Boolean signature
) {
    /** Igual que el real: todo activado si no se especifica lo contrario. */
    public static ReportConfig defaults() {
        return new ReportConfig(true, true, true, true, true, true, true, true, true, true, true);
    }

    public boolean showCost() { return cost == null || cost; }
    public boolean showComments() { return comments == null || comments; }
    public boolean showTasks() { return tasks == null || tasks; }
    public boolean showWorkOrderHistory() { return workOrderHistory == null || workOrderHistory; }
    public boolean showEstimatedTime() { return estimatedTime == null || estimatedTime; }
    public boolean showLocationAddress() { return locationAddress == null || locationAddress; }
    public boolean showPriority() { return priority == null || priority; }
    public boolean showWorkOrderInformation() { return workOrderInformation == null || workOrderInformation; }
    public boolean showRelations() { return relations == null || relations; }
    public boolean showFiles() { return files == null || files; }
    public boolean showSignature() { return signature == null || signature; }
}
