package com.tuempresa.cmms.model.entity;

import com.tuempresa.cmms.tenant.BaseTenantEntity;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.time.Instant;

@Entity
@Table(name = "meter_readings")
@Getter
@Setter
public class MeterReading extends BaseTenantEntity {

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "meter_id", nullable = false)
    private Meter meter;

    @Column(nullable = false)
    private Double value;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "created_by_id")
    private User createdBy;

    private Instant readingDate = Instant.now();

    /**
     * Equipo fisico que dio esta lectura. Permite saber, meses despues,
     * que contador estaba instalado cuando se registro.
     *
     * Las lecturas anteriores al primer reemplazo lo tienen en null.
     */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "device_id")
    private MeterDevice device;
}
