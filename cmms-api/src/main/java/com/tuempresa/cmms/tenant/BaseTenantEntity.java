package com.tuempresa.cmms.tenant;

import com.tuempresa.cmms.model.entity.BaseEntity;
import jakarta.persistence.Column;
import jakarta.persistence.MappedSuperclass;
import lombok.Getter;
import lombok.Setter;
import org.hibernate.annotations.Filter;
import org.hibernate.annotations.FilterDef;
import org.hibernate.annotations.ParamDef;

/**
 * Toda entidad que pertenece a una organizacion (tenant) debe extender esta clase.
 * El filtro "tenantFilter" se activa por request en TenantFilter.java,
 * garantizando que cada query JPA excluya automaticamente datos de otras organizaciones.
 */
@MappedSuperclass
@Getter
@Setter
@FilterDef(name = "tenantFilter", parameters = @ParamDef(name = "orgId", type = Long.class))
@Filter(name = "tenantFilter", condition = "organization_id = :orgId")
public abstract class BaseTenantEntity extends BaseEntity {

    @Column(name = "organization_id", nullable = false, updatable = false)
    private Long organizationId;
}
