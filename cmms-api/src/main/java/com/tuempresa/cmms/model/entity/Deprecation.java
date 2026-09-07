package com.tuempresa.cmms.model.entity;

import com.tuempresa.cmms.tenant.BaseTenantEntity;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDate;

@Entity
@Table(name = "deprecations")
@Getter
@Setter
public class Deprecation extends BaseTenantEntity {

    private Double purchasePrice;
    private LocalDate purchaseDate;
    private Double residualValue;
    private String usefulLife;
    private Integer rate; // porcentaje anual
    private Double currentValue;
}
