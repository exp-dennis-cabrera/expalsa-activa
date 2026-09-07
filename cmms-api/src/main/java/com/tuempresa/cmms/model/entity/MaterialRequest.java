package com.tuempresa.cmms.model.entity;

import com.tuempresa.cmms.model.enums.MaterialRequestStatus;
import com.tuempresa.cmms.tenant.BaseTenantEntity;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

/**
 * Solicitud de materiales a bodega, ligada a una orden de trabajo. El ERP es
 * la fuente de verdad del stock y de la aprobacion (circuito interno de
 * compras/bodega); esta entidad guarda el "espejo" del lado del CMMS: que se
 * pidio, y el estado que el ERP nos devolvio. Mientras no exista una
 * conexion real al ERP, un Admin puede aprobar/rechazar manualmente desde
 * aqui mismo (ver MaterialRequestController) -- el mismo endpoint que
 * llamara el webhook del ERP el dia que se conecte de verdad.
 */
@Entity
@Table(name = "material_requests")
@Getter
@Setter
public class MaterialRequest extends BaseTenantEntity {

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "work_order_id", nullable = false)
    private WorkOrder workOrder;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "requested_by_id")
    private User requestedBy;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private MaterialRequestStatus status = MaterialRequestStatus.PENDING;

    private String notes;

    // Id de esta solicitud del lado del ERP, una vez que se conecte de verdad.
    private String erpRequestId;

    private String rejectionReason;
    private String decidedByErp;
    private Instant decidedAt;

    @OneToMany(mappedBy = "materialRequest", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<MaterialRequestItem> items = new ArrayList<>();
}
