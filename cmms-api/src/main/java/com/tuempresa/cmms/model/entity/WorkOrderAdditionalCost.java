package com.tuempresa.cmms.model.entity;

import com.tuempresa.cmms.tenant.BaseTenantEntity;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

/**
 * Costo ad-hoc agregado a un work order (contratista, horas extra, emergencia, etc.),
 * segun las categorias de costo reales de Atlas CMMS.
 */
@Entity
@Table(name = "work_order_additional_costs")
@Getter
@Setter
public class WorkOrderAdditionalCost extends BaseTenantEntity {

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "work_order_id", nullable = false)
    private WorkOrder workOrder;

    @Column(nullable = false)
    private String description;

    @Column(nullable = false)
    private Double cost;

    private String category;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "created_by_id")
    private User createdBy;
}
