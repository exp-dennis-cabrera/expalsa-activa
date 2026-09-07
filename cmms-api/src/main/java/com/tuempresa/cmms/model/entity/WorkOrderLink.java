package com.tuempresa.cmms.model.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

/**
 * Vinculo entre dos work orders. Se guarda una sola fila por vinculo;
 * al listar, se consulta por ambos lados (workOrder o linkedWorkOrder)
 * para que el vinculo aparezca simetrico en ambas ordenes.
 */
@Entity
@Table(name = "work_order_links")
@Getter
@Setter
public class WorkOrderLink {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "work_order_id", nullable = false)
    private WorkOrder workOrder;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "linked_work_order_id", nullable = false)
    private WorkOrder linkedWorkOrder;
}
