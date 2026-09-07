package com.tuempresa.cmms.model.enums;

/**
 * Refleja exactamente los estados de Atlas CMMS: Open, In Progress, On Hold, Complete.
 * https://docs.atlas-cmms.com/workflows-management/work-order/managing-manual-work-orders/viewing-work-orders/
 */
public enum WorkOrderStatus {
    OPEN("Abierta"),
    IN_PROGRESS("En progreso"),
    ON_HOLD("En espera"),
    COMPLETED("Completada");

    private final String etiqueta;

    WorkOrderStatus(String etiqueta) {
        this.etiqueta = etiqueta;
    }

    /**
     * Nombre legible del estado, para mensajes dirigidos al usuario.
     *
     * Sin esto, las notificaciones mostraban el valor tecnico del enum:
     * "cambio de estado a COMPLETED" en vez de "a Completada".
     */
    public String getEtiqueta() {
        return etiqueta;
    }
}
