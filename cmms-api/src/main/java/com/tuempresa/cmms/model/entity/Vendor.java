package com.tuempresa.cmms.model.entity;

import com.tuempresa.cmms.tenant.BaseTenantEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.Setter;

/**
 * "Contratista" en Atlas CMMS = Vendor. Version minima: nombre, tipo y tarifa.
 */
@Entity
@Table(name = "vendors")
@Getter
@Setter
public class Vendor extends BaseTenantEntity {

    @Column(nullable = false)
    private String companyName;

    private String vendorType;
    private Double rate;
    private String email;
}
