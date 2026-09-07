package com.tuempresa.cmms.model.entity;

import com.tuempresa.cmms.model.enums.TaskType;
import com.tuempresa.cmms.tenant.BaseTenantEntity;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

/**
 * Igual que Task.java real de Atlas: un item de checklist. Puede vivir en
 * una orden de trabajo (workOrder != null) o ser una plantilla de un
 * Mantenimiento Preventivo (preventiveMaintenance != null) que se copia a
 * cada orden que ese PM genera.
 */
@Entity
@Table(name = "tasks")
@Getter
@Setter
public class Task extends BaseTenantEntity {

    @Column(nullable = false)
    private String label;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private TaskType type = TaskType.TEXT;

    private Integer orderIndex = 0;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "work_order_id")
    private WorkOrder workOrder;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "preventive_maintenance_id")
    private PreventiveMaintenance preventiveMaintenance;

    // Resultado capturado al completar la tarea (texto libre, numero como
    // texto, "true"/"false" para checkbox)
    private String value;
    private Boolean completed = false;
}
