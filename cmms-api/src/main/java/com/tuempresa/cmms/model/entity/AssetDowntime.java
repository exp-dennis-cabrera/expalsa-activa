package com.tuempresa.cmms.model.entity;

import com.tuempresa.cmms.tenant.BaseTenantEntity;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.time.Instant;

/**
 * Igual que AssetDowntime real de Atlas: un periodo de inactividad de un
 * activo, con inicio y duracion (en segundos). Se usa para calcular MTBF
 * (tiempo medio entre fallas) y MTTR (tiempo medio de reparacion).
 */
@Entity
@Table(name = "asset_downtimes")
@Getter
@Setter
public class AssetDowntime extends BaseTenantEntity {

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "asset_id", nullable = false)
    private Asset asset;

    private Instant startsOn;

    // segundos; null mientras el activo sigue caido (downtime en curso)
    private Long durationSeconds;

    public Instant getEndsOn() {
        return durationSeconds != null ? startsOn.plusSeconds(durationSeconds) : null;
    }
}
