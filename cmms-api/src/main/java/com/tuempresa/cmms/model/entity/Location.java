package com.tuempresa.cmms.model.entity;

import com.tuempresa.cmms.tenant.BaseTenantEntity;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.util.HashSet;
import java.util.Set;

@Entity
@Table(name = "locations")
@Getter
@Setter
public class Location extends BaseTenantEntity {

    @Column(nullable = false)
    private String name;

    private String customId;
    private String address;
    private Double latitude;
    private Double longitude;
    private String imageUrl;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "parent_location_id")
    private Location parentLocation;

    // Igual que location.getUsers() real de Atlas: usuarios que reciben
    // aviso cuando se les asigna esta ubicacion.
    @ManyToMany
    @JoinTable(name = "location_assigned_users",
            joinColumns = @JoinColumn(name = "location_id"),
            inverseJoinColumns = @JoinColumn(name = "user_id"))
    private Set<User> assignedUsers = new HashSet<>();

    // Lado inverso de Team.locations (tabla team_locations) -- se edita desde
    // el equipo, no desde la ubicacion, mismo patron que Asset.teams.
    @ManyToMany(mappedBy = "locations")
    private Set<Team> teams = new HashSet<>();

    @ManyToMany
    @JoinTable(name = "location_vendors",
            joinColumns = @JoinColumn(name = "location_id"),
            inverseJoinColumns = @JoinColumn(name = "vendor_id"))
    private Set<Vendor> vendors = new HashSet<>();
}
