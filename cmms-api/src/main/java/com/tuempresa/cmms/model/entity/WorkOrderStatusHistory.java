package com.tuempresa.cmms.model.entity;

import com.tuempresa.cmms.model.enums.WorkOrderStatus;
import com.tuempresa.cmms.tenant.BaseTenantEntity;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.time.Instant;

/**
 * Igual que la auditoria via Hibernate Envers que usa el WOAnalyticsController
 * real para reconstruir "cual era el estado de esta orden en tal fecha".
 * Cada vez que una orden se crea o cambia de estado, queda una fila aca --
 * asi el grafico de tendencia refleja el estado historico real, no el
 * estado actual.
 */
@Entity
@Table(name = "work_order_status_history")
@Getter
@Setter
public class WorkOrderStatusHistory extends BaseTenantEntity {

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "work_order_id", nullable = false)
    private WorkOrder workOrder;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private WorkOrderStatus status;

    @Column(nullable = false)
    private Instant changedAt;

    /**
     * Quien hizo el cambio. Se necesita para mostrar el cambio de estado
     * como comentario automatico, igual que en el original: alli el
     * historial se convierte en comentarios con el usuario que lo genero.
     */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "changed_by_id")
    private User changedBy;
}
