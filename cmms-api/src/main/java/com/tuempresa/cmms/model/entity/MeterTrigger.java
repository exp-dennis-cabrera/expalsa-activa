package com.tuempresa.cmms.model.entity;

import com.tuempresa.cmms.model.enums.MeterTriggerCondition;
import com.tuempresa.cmms.model.enums.WorkOrderPriority;
import com.tuempresa.cmms.tenant.BaseTenantEntity;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

/**
 * Igual que WorkOrderMeterTrigger real de Atlas: si una lectura de medidor
 * cruza este umbral, se genera automaticamente una orden de trabajo con
 * estos campos plantilla.
 */
@Entity
@Table(name = "meter_triggers")
@Getter
@Setter
public class MeterTrigger extends BaseTenantEntity {

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "meter_id", nullable = false)
    private Meter meter;

    // Nombre del disparador -- distinto del titulo de la orden que genera,
    // igual patron que PreventiveMaintenance.name vs .title.
    @Column(nullable = false)
    private String name;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private MeterTriggerCondition condition;

    @Column(nullable = false)
    private Double value;

    // Dias de espera antes de poder volver a dispararse (evita generar una
    // orden nueva por cada lectura si la condicion sigue cumpliendose).
    private Integer waitBeforeDays = 0;
    private java.time.Instant lastTriggeredAt;

    // Plantilla de la orden que se genera al dispararse -- igual conjunto de
    // campos que WorkOrderBase (mismo que WorkOrder/PM/Request), ya que el
    // WorkOrderMeterTrigger real de Atlas extiende esa misma base.
    @Column(nullable = false)
    private String workOrderTitle;

    private String workOrderDescription;

    @Enumerated(EnumType.STRING)
    private WorkOrderPriority priority = WorkOrderPriority.MEDIUM;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "category_id")
    private Category category;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "location_id")
    private Location location;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "asset_id")
    private Asset asset;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "team_id")
    private Team team;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "primary_assignee_id")
    private User primaryAssignee;

    private java.time.Instant dueDate;
    private java.time.Instant estimatedStartDate;
    private Integer estimatedDurationMinutes;
}
