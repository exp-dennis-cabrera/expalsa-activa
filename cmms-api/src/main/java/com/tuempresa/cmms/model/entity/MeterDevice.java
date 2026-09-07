package com.tuempresa.cmms.model.entity;

import com.tuempresa.cmms.tenant.BaseTenantEntity;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.time.Instant;

/**
 * Equipo fisico de un medidor.
 *
 * Un medidor logico ("Consumo Sala de Maquinas") puede pasar por varios
 * equipos fisicos a lo largo del tiempo: cuando uno se daña, se reemplaza y
 * el contador nuevo arranca en cero.
 *
 * Esta tabla guarda esa historia:
 *   - que numero de serie estuvo instalado en cada periodo
 *   - cuanto acumulo el equipo anterior (offsetValue), para que el consumo
 *     acumulado del medidor siga siendo continuo
 *
 * Ejemplo:
 *   Equipo A: 01/01 - 15/08, offset 0,      ultima lectura 12.450
 *   Equipo B: 15/08 - hoy,   offset 12.450, lectura fisica 35
 *   -> acumulado real = 12.450 + 35 = 12.485
 *
 * Desviacion consciente de Atlas CMMS, que no contempla el reemplazo de
 * medidores: alli un contador que vuelve a cero rompe el historico.
 */
@Entity
@Table(name = "meter_devices")
@Getter
@Setter
public class MeterDevice extends BaseTenantEntity {

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "meter_id", nullable = false)
    private Meter meter;

    /** Numero de serie del equipo fisico. Opcional pero recomendado. */
    private String serialNumber;

    /**
     * Cuanto acumularon los equipos ANTERIORES. El primero lleva 0; cada
     * reemplazo hereda el acumulado del que sale.
     */
    @Column(nullable = false)
    private Double offsetValue = 0.0;

    /** Desde cuando esta instalado. */
    @Column(nullable = false)
    private Instant installedAt = Instant.now();

    /** Cuando se retiro. Null = es el equipo activo. */
    private Instant removedAt;

    /** Quien autorizo el reemplazo. Se muestra en el detalle del medidor. */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "replaced_by_id")
    private User replacedBy;

    /** Motivo del reemplazo: "medidor dañado", "calibracion vencida"... */
    private String notes;
}
