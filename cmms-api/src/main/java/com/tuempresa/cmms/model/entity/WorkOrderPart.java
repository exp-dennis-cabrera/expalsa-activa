package com.tuempresa.cmms.model.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

/**
 * Uso de un repuesto (Part) en un work order especifico. Al agregarse,
 * descuenta automaticamente el stock del Part (igual que en Atlas CMMS:
 * "Automatic parts usage tracking").
 */
@Entity
@Table(name = "work_order_parts")
@Getter
@Setter
public class WorkOrderPart {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "work_order_id", nullable = false)
    private WorkOrder workOrder;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "part_id", nullable = false)
    private Part part;

    @Column(nullable = false)
    private Integer quantityUsed = 1;

    private Double unitCostSnapshot;
}
