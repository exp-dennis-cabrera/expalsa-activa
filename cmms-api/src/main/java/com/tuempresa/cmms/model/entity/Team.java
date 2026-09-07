package com.tuempresa.cmms.model.entity;

import com.tuempresa.cmms.tenant.BaseTenantEntity;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.util.HashSet;
import java.util.Set;

@Entity
@Table(name = "teams")
@Getter
@Setter
public class Team extends BaseTenantEntity {

    @Column(nullable = false)
    private String name;

    private String description;

    // Igual que el real: quien creo el equipo puede editarlo/eliminarlo
    // aunque su rol no tenga editOther/deleteOther de PEOPLE_AND_TEAMS.
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "created_by_id")
    private User createdBy;

    @ManyToMany
    @JoinTable(
            name = "team_members",
            joinColumns = @JoinColumn(name = "team_id"),
            inverseJoinColumns = @JoinColumn(name = "user_id")
    )
    private Set<User> members = new HashSet<>();

    // Igual que el Team.java real de Atlas: un equipo puede ser responsable
    // de ciertos activos y ciertas ubicaciones, no solo agrupar personas.
    @ManyToMany
    @JoinTable(
            name = "team_assets",
            joinColumns = @JoinColumn(name = "team_id"),
            inverseJoinColumns = @JoinColumn(name = "asset_id")
    )
    private Set<Asset> assets = new HashSet<>();

    @ManyToMany
    @JoinTable(
            name = "team_locations",
            joinColumns = @JoinColumn(name = "team_id"),
            inverseJoinColumns = @JoinColumn(name = "location_id")
    )
    private Set<Location> locations = new HashSet<>();

    // "List of teams assigned to the part" -- igual patron real de Atlas
    // (Asset.teams, Location.teams, Part.teams todos identicos).
    @ManyToMany
    @JoinTable(
            name = "team_parts",
            joinColumns = @JoinColumn(name = "team_id"),
            inverseJoinColumns = @JoinColumn(name = "part_id")
    )
    private Set<Part> parts = new HashSet<>();
}
