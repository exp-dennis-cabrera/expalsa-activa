package com.tuempresa.cmms.model.entity;

import com.tuempresa.cmms.model.enums.WorkOrderPriority;
import com.tuempresa.cmms.model.enums.WorkOrderStatus;
import com.tuempresa.cmms.model.enums.WorkOrderType;
import com.tuempresa.cmms.tenant.BaseTenantEntity;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.time.Instant;
import java.util.HashSet;
import java.util.Set;

@org.hibernate.envers.Audited(withModifiedFlag = true)
@Entity
@Table(name = "work_orders")
@Getter
@Setter
public class WorkOrder extends BaseTenantEntity {

    @Column(nullable = false)
    private String title;

    // ID de negocio tipo "WO000123", igual patron que PreventiveMaintenance.customId.
    private String customId;

    @Column(columnDefinition = "TEXT")
    private String description;

    @Enumerated(EnumType.STRING)
    private WorkOrderStatus status = WorkOrderStatus.OPEN;

    @Enumerated(EnumType.STRING)
    private WorkOrderPriority priority = WorkOrderPriority.NONE;

    @Enumerated(EnumType.STRING)
    private WorkOrderType type = WorkOrderType.CORRECTIVE;

    @org.hibernate.envers.Audited(targetAuditMode = org.hibernate.envers.RelationTargetAuditMode.NOT_AUDITED, withModifiedFlag = true)
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "category_id")
    private Category category;

    @org.hibernate.envers.Audited(targetAuditMode = org.hibernate.envers.RelationTargetAuditMode.NOT_AUDITED, withModifiedFlag = true)
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "asset_id")
    private Asset asset;

    @org.hibernate.envers.Audited(targetAuditMode = org.hibernate.envers.RelationTargetAuditMode.NOT_AUDITED, withModifiedFlag = true)
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "location_id")
    private Location location;

    @org.hibernate.envers.Audited(targetAuditMode = org.hibernate.envers.RelationTargetAuditMode.NOT_AUDITED, withModifiedFlag = true)
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "created_by_id")
    private User createdBy;

    // Quien la marco como completada -- para el filtro avanzado "completado por".
    @org.hibernate.envers.Audited(targetAuditMode = org.hibernate.envers.RelationTargetAuditMode.NOT_AUDITED, withModifiedFlag = true)
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "completed_by_id")
    private User completedBy;

    // El "Trabajador principal" de Atlas: responsable unico y visible de la orden.
    @org.hibernate.envers.Audited(targetAuditMode = org.hibernate.envers.RelationTargetAuditMode.NOT_AUDITED, withModifiedFlag = true)
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "primary_assignee_id")
    private User primaryAssignee;

    // Los "Trabajadores adicionales" de Atlas: apoyo, no responsables principales.
    @org.hibernate.envers.NotAudited
    @ManyToMany
    @JoinTable(
            name = "work_order_assignees",
            joinColumns = @JoinColumn(name = "work_order_id"),
            inverseJoinColumns = @JoinColumn(name = "user_id")
    )
    private Set<User> assignees = new HashSet<>();

    @org.hibernate.envers.Audited(targetAuditMode = org.hibernate.envers.RelationTargetAuditMode.NOT_AUDITED, withModifiedFlag = true)
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "vendor_id")
    private Vendor vendor;

    // "El equipo asignado para realizar el trabajo" -- igual que WorkOrderBase.team
    // real de Atlas: complementa (no reemplaza) al trabajador principal.
    @org.hibernate.envers.Audited(targetAuditMode = org.hibernate.envers.RelationTargetAuditMode.NOT_AUDITED, withModifiedFlag = true)
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "team_id")
    private Team team;

    // Si esta orden fue generada automaticamente por un Mantenimiento
    // Preventivo, referencia a ese PM (igual que parentPreventiveMaintenance
    // real de Atlas).
    @org.hibernate.envers.Audited(targetAuditMode = org.hibernate.envers.RelationTargetAuditMode.NOT_AUDITED, withModifiedFlag = true)
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "parent_preventive_maintenance_id")
    private PreventiveMaintenance parentPreventiveMaintenance;

    // Si esta orden nacio de una Solicitud aprobada, referencia a esa
    // solicitud (igual que parentRequest real de Atlas).
    @OneToOne(mappedBy = "workOrder", fetch = FetchType.LAZY)
    private Request parentRequest;

    // Igual que firstTimeToReact real de Atlas: se marca la primera vez que
    // alguien "toca" la orden (cambia su estado, comenta, etc). Si un PM
    // genera varias ordenes seguidas y ninguna se marca nunca, es señal de
    // que nadie las esta viendo -- se usa para auto-desactivar el PM.
    private Instant firstReactedAt;

    // Con hora, igual que el datetime-picker real de Atlas (antes solo teniamos fecha).
    private Instant dueDate;
    private Instant estimatedStartDate;

    private Boolean requiresSignature = false;

    // Se piden al completar, si la orden requiere firma -- misma logica que
    // el modal CompleteWorkOrderModal.tsx real.
    private String feedback;
    @jakarta.persistence.Column(columnDefinition = "TEXT")
    private String signature;

    private Instant completedAt;
    private Integer estimatedDurationMinutes;
    private Integer actualDurationMinutes;

    // "Archivar" es distinto de eliminar: oculta la orden del listado sin
    // borrarla, igual que el "archive" real de Atlas (vs "delete").
    private Boolean archived = false;
}
