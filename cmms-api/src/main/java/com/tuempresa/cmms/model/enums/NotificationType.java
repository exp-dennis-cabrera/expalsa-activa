package com.tuempresa.cmms.model.enums;

/**
 * Copia exacta de NotificationType real (com.grash.model.enums.NotificationType).
 *
 * IMPORTANTE: estos valores indican a que MODULO pertenece el recurso
 * relacionado (para saber a donde navegar al hacer clic y que icono
 * mostrar), NO "que paso". El "que paso" va en el titulo/mensaje de la
 * notificacion.
 */
public enum NotificationType {
    INFO,
    ASSET,
    WORK_ORDER,
    PART,
    METER,
    /**
     * Aviso diario de lecturas no registradas. Lleva a la LISTA de
     * medidores pendientes, no a un medidor concreto -- por eso no
     * reutiliza METER, que abre el detalle de uno.
     */
    METER_READING_OVERDUE,
    LOCATION,
    TEAM,
    REQUEST,
    PURCHASE_ORDER,
}
