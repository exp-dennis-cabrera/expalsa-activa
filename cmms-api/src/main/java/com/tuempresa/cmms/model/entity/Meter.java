package com.tuempresa.cmms.model.entity;

import com.tuempresa.cmms.tenant.BaseTenantEntity;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

@Entity
@Table(name = "meters")
@Getter
@Setter
public class Meter extends BaseTenantEntity {

    @Column(nullable = false)
    private String name;

    private String unit;

    @Column(nullable = false)
    private Integer updateFrequencyDays = 30;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "asset_id", nullable = false)
    private Asset asset;

    // Ubicacion propia del medidor -- campo editable independiente, igual
    // que getMeterFields() real (no es solo "la ubicacion del activo").
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "location_id")
    private Location location;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "category_id")
    private Category category;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "created_by_id")
    private User createdBy;

    // Se avisa a estos usuarios cuando una lectura cruza un umbral de este medidor.
    @ManyToMany
    @JoinTable(name = "meter_assigned_users",
            joinColumns = @JoinColumn(name = "meter_id"),
            inverseJoinColumns = @JoinColumn(name = "user_id"))
    private java.util.Set<User> assignedUsers = new java.util.HashSet<>();

    /**
     * Equipo responsable del medidor. UNO solo: un medidor pertenece al
     * equipo electrico, o al de planta de agua, o al mecanico -- no a
     * varios.
     *
     * Determina quien lo ve: los integrantes del equipo, mas quien tenga
     * permiso de "ver de otros" (el jefe de mantenimiento).
     *
     * Desviacion consciente de Atlas CMMS, que no restringe medidores por
     * equipo.
     */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "team_id")
    private Team team;

    /**
     * Medidor deshabilitado: se oculta del listado sin borrarlo.
     *
     * Distinto de eliminar -- las lecturas historicas se conservan y se
     * puede volver a habilitar. Sirve para equipos retirados de servicio o
     * lineas paradas por temporada.
     *
     * Un medidor deshabilitado NO cuenta para el estado de vencimiento:
     * no aparece como pendiente ni incumplido.
     */
    private Boolean disabled = false;
}
