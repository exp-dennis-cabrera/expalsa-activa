package com.tuempresa.cmms.model.entity;

import com.tuempresa.cmms.model.enums.WorkOrderPriority;
import com.tuempresa.cmms.model.enums.WorkOrderType;
import com.tuempresa.cmms.tenant.BaseTenantEntity;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.time.Instant;

/**
 * Igual que Request.java real de Atlas: comparte los mismos campos base que
 * WorkOrder (extiende WorkOrderBase alli; aqui duplicamos los campos ya que
 * Java no permite herencia multiple de entidades JPA de forma simple).
 * El estado (Pendiente/Aprobada/Cancelada) se DERIVA, no se guarda: si
 * workOrder != null -> Aprobada; si cancelled=true -> Cancelada; si no,
 * Pendiente -- igual que el original.
 */
@Entity
@Table(name = "requests")
@Getter
@Setter
public class Request extends BaseTenantEntity {

    private String customId;

    @Column(nullable = false)
    private String title;

    @Column(columnDefinition = "TEXT")
    private String description;

    @Enumerated(EnumType.STRING)
    private WorkOrderPriority priority = WorkOrderPriority.NONE;

    @Enumerated(EnumType.STRING)
    private WorkOrderType type;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "category_id")
    private Category category;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "asset_id")
    private Asset asset;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "location_id")
    private Location location;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "team_id")
    private Team team;

    private Instant dueDate;
    private Integer estimatedDurationMinutes;

    /** Igual que WorkOrderBase.estimatedStartDate real: cuando se preve empezar el trabajo. */
    private Instant estimatedStartDate;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "created_by_id")
    private User createdBy;

    // Contacto de quien pide, para cuando quien solicita no es un usuario
    // del sistema (portal publico -- no implementado aqui, pero el campo
    // se deja disponible por si se solicita despues).
    private String contact;

    private Boolean cancelled = false;
    private String cancellationReason;

    // Orden de trabajo generada al aprobar (null mientras este pendiente)
    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "work_order_id")
    private WorkOrder workOrder;
}
