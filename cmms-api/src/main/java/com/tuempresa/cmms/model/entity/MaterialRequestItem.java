package com.tuempresa.cmms.model.entity;

import com.tuempresa.cmms.tenant.BaseTenantEntity;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

@Entity
@Table(name = "material_request_items")
@Getter
@Setter
public class MaterialRequestItem extends BaseTenantEntity {

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "material_request_id", nullable = false)
    private MaterialRequest materialRequest;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "part_id", nullable = false)
    private Part part;

    @Column(nullable = false)
    private Integer requestedQuantity;

    // Null hasta que el ERP resuelva; permite aprobacion parcial (real:
    // seccion 8.2 del documento de requerimientos, "aprobacion parcial").
    private Integer approvedQuantity;
}
