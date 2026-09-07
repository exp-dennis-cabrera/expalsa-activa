package com.tuempresa.cmms.model.entity;

import com.tuempresa.cmms.tenant.BaseTenantEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.Setter;

/**
 * Catalogo de categorias administrable, igual que en Atlas (categorias de
 * Work Order, Asset, Part, etc, diferenciadas por "type").
 */
@Entity
@Table(name = "categories")
@Getter
@Setter
public class Category extends BaseTenantEntity {

    @Column(nullable = false)
    private String name;

    private String description;

    // WORK_ORDER, ASSET, PART, METER, etc. Por ahora solo usamos WORK_ORDER.
    @Column(nullable = false)
    private String type = "WORK_ORDER";

    /**
     * Categoria padre, para agrupar variantes bajo un concepto comun:
     * "Agua dulce" y "Agua clarificada" cuelgan de "Agua".
     *
     * Solo DOS niveles: una categoria con padre no puede tener hijas. Asi
     * las consultas y los filtros no se complican.
     *
     * Desviacion consciente de Atlas CMMS, cuyas categorias son planas.
     */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "parent_id")
    private Category parent;
}
