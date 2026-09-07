package com.tuempresa.cmms.model.entity;

import com.tuempresa.cmms.model.enums.RecurrenceBasedOn;
import com.tuempresa.cmms.model.enums.RecurrenceType;
import com.tuempresa.cmms.model.enums.WorkOrderPriority;
import com.tuempresa.cmms.tenant.BaseTenantEntity;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.time.Instant;
import java.util.List;

/**
 * Replica el PreventiveMaintenance.java real de Atlas: extiende (aqui,
 * duplica) los mismos campos base que WorkOrder, mas un Schedule con las
 * reglas de recurrencia. La generacion automatica de ordenes usa un
 * @Scheduled de Spring en vez de Quartz (ver PreventiveMaintenanceScheduler)
 * -- mismo resultado funcional, sin la dependencia de jobs persistentes.
 */
@Entity
@Table(name = "preventive_maintenances")
@Getter
@Setter
public class PreventiveMaintenance extends BaseTenantEntity {

    private String customId;

    @Column(nullable = false)
    private String name;

    // Titulo de la orden de trabajo que se genera -- distinto del "name" del
    // disparador. Igual que Atlas real: el formulario tiene "Nombre del
    // disparador" (identifica este PM) y "Titulo de la orden de trabajo"
    // (lo que vera cada orden generada) como campos separados.
    @Column(nullable = false)
    private String title;

    private String description;

    @Enumerated(EnumType.STRING)
    private WorkOrderPriority priority = WorkOrderPriority.NONE;

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

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "primary_assignee_id")
    private User primaryAssignee;

    private Integer estimatedDurationMinutes;

    @OneToOne(cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.LAZY)
    @JoinColumn(name = "schedule_id")
    private Schedule schedule;

    @OneToMany(mappedBy = "parentPreventiveMaintenance")
    private List<WorkOrder> generatedWorkOrders;

    // Ultima vez que este PM genero una orden -- usado por el scheduler para
    // calcular si ya toca generar la siguiente (reemplaza el trigger de Quartz).
    private Instant lastGeneratedAt;

    // Igual que daysBeforePrevMaintNotification real de Atlas (alli es un
    // ajuste global de la empresa; aqui lo simplificamos a por-PM). Avisa por
    // correo N dias antes de que el PM genere la proxima orden.
    private Integer daysBeforeNotification = 3;
    private Instant lastNotifiedAt;
}
