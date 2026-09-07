package com.tuempresa.cmms.model.entity;

import com.tuempresa.cmms.tenant.BaseTenantEntity;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.util.HashSet;
import java.util.Set;

@Entity
@Table(name = "parts")
@Getter
@Setter
public class Part extends BaseTenantEntity {

    @Column(nullable = false)
    private String name;

    // Codigo del repuesto en el ERP -- el ERP es la fuente de verdad del
    // inventario, asi que este es el identificador real que se usa en la
    // integracion (consultas de stock/costo, solicitudes de materiales).
    // No generamos un codigo propio nuestro.
    @Column(name = "erp_sku")
    private String erpSku;

    private Integer quantity = 0;
    private Integer minQuantity = 0;
    private Double cost;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "location_id")
    private Location location;

    // Igual que part.getUsers() real de Atlas: usuarios que reciben aviso
    // cuando se les asigna el repuesto y cuando su stock baja del minimo.
    @ManyToMany
    @JoinTable(name = "part_assigned_users",
            joinColumns = @JoinColumn(name = "part_id"),
            inverseJoinColumns = @JoinColumn(name = "user_id"))
    private Set<User> assignedUsers = new HashSet<>();
}
