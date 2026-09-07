package com.tuempresa.cmms.model.entity;

import com.tuempresa.cmms.model.enums.AssetStatus;
import com.tuempresa.cmms.tenant.BaseTenantEntity;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDate;
import java.util.HashSet;
import java.util.Set;

@Entity
@Table(name = "assets")
@Getter
@Setter
public class Asset extends BaseTenantEntity {

    private String customId;

    @Column(nullable = false)
    private String name;

    @Column(columnDefinition = "TEXT")
    private String description;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private AssetStatus status = AssetStatus.OPERATIONAL;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "category_id")
    private Category category;

    private String serialNumber;
    private String model;
    private String manufacturer;
    private String power;
    private String area;
    private String barCode;
    private String nfcId;

    private LocalDate acquisitionDate;
    private Double acquisitionCost;
    private LocalDate warrantyExpirationDate;
    private LocalDate inServiceDate;

    @Column(columnDefinition = "TEXT")
    private String additionalInfos;

    private String imageUrl;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "location_id")
    private Location location;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "parent_asset_id")
    private Asset parentAsset;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "primary_user_id")
    private User primaryUser;

    @OneToOne(cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.LAZY)
    @JoinColumn(name = "deprecation_id")
    private Deprecation deprecation;

    @ManyToMany
    @JoinTable(name = "asset_assigned_users",
            joinColumns = @JoinColumn(name = "asset_id"),
            inverseJoinColumns = @JoinColumn(name = "user_id"))
    private Set<User> assignedUsers = new HashSet<>();

    // Lado inverso de Team.assets (tabla team_assets) -- NO es una relacion
    // propia. Se edita desde el equipo (TeamDialog), no desde el activo,
    // para evitar dos tablas de union desincronizadas para el mismo vinculo.
    @ManyToMany(mappedBy = "assets")
    private Set<Team> teams = new HashSet<>();

    @ManyToMany
    @JoinTable(name = "asset_vendors",
            joinColumns = @JoinColumn(name = "asset_id"),
            inverseJoinColumns = @JoinColumn(name = "vendor_id"))
    private Set<Vendor> vendors = new HashSet<>();

    @ManyToMany
    @JoinTable(name = "asset_parts",
            joinColumns = @JoinColumn(name = "asset_id"),
            inverseJoinColumns = @JoinColumn(name = "part_id"))
    private Set<Part> parts = new HashSet<>();
}
