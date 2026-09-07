package com.tuempresa.cmms.model.entity;

import com.tuempresa.cmms.model.enums.CustomFieldEntityType;
import com.tuempresa.cmms.model.enums.CustomFieldType;
import com.tuempresa.cmms.tenant.BaseTenantEntity;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.util.ArrayList;
import java.util.List;

/**
 * Igual que CustomField real de Atlas: define un campo extra que el Admin
 * agrega a un tipo de entidad (Orden de trabajo, PM, Activo). "copyOnRepeat"
 * (aqui copyOnGenerate) controla si el valor se copia a cada orden generada
 * por un PM, igual que en el real.
 */
@Entity
@Table(name = "custom_fields")
@Getter
@Setter
public class CustomField extends BaseTenantEntity {

    @Column(nullable = false)
    private String name;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private CustomFieldType type = CustomFieldType.TEXT;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private CustomFieldEntityType entityType;

    private Boolean required = false;
    private Boolean copyOnGenerate = true;

    // Opciones para type=SELECT, separadas por coma
    @ElementCollection
    @CollectionTable(name = "custom_field_options", joinColumns = @JoinColumn(name = "custom_field_id"))
    @Column(name = "option_value")
    private List<String> options = new ArrayList<>();
}
