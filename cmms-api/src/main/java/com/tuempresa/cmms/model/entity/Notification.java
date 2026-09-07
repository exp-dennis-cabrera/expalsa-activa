package com.tuempresa.cmms.model.entity;

import com.tuempresa.cmms.model.enums.NotificationType;
import com.tuempresa.cmms.tenant.BaseTenantEntity;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

/**
 * Copia fiel del modelo Notification real: el campo clave es "resourceId",
 * un ID GENERICO que apunta al recurso relacionado, combinado con
 * "notificationType" para saber de que modulo es (orden de trabajo,
 * activo, medidor, ubicacion, equipo, solicitud, repuesto...). Antes
 * teniamos "workOrderId", que solo permitia enlazar a ordenes de trabajo
 * -- cualquier otra notificacion quedaba sin destino al hacer clic.
 *
 * Mantenemos "title" (que el real no tiene) porque nuestras notificaciones
 * separan titulo y detalle; el real mete todo en "message".
 */
@Entity
@Table(name = "notifications")
@Getter
@Setter
public class Notification extends BaseTenantEntity {

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "recipient_id", nullable = false)
    private User recipient;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private NotificationType notificationType;

    @Column(nullable = false)
    private String title;

    @Column(columnDefinition = "TEXT")
    private String message;

    /** ID del recurso relacionado -- se interpreta segun notificationType. */
    private Long resourceId;

    @Column(nullable = false)
    private Boolean isRead = false;
}
