package com.tuempresa.cmms.model.entity;

import com.tuempresa.cmms.tenant.BaseTenantEntity;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

/**
 * Version simplificada del FloorPlan real de Atlas: nombre + area (m2) +
 * imagen. El real ademas permite colocar "pines" de activos sobre la imagen
 * del plano (un editor visual completo) -- eso no se implementa aqui.
 */
@Entity
@Table(name = "floor_plans")
@Getter
@Setter
public class FloorPlan extends BaseTenantEntity {

    @Column(nullable = false)
    private String name;

    private Double area;
    private String imageUrl;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "location_id", nullable = false)
    private Location location;
}
