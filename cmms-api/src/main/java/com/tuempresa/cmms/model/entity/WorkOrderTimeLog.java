package com.tuempresa.cmms.model.entity;

import com.tuempresa.cmms.tenant.BaseTenantEntity;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.time.Instant;
import java.time.LocalDate;

/**
 * Registro de horas trabajadas por un usuario en un work order ("Agregar tiempo" en Atlas).
 * El costo por hora se captura como snapshot al momento de crear el registro,
 * para que cambios futuros al hourlyRate del usuario no alteren el historico.
 */
@Entity
@Table(name = "work_order_time_logs")
@Getter
@Setter
public class WorkOrderTimeLog extends BaseTenantEntity {

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "work_order_id", nullable = false)
    private WorkOrder workOrder;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    private Double hours;

    private LocalDate logDate;

    private Double hourlyRateSnapshot;

    // Soporte para timer en vivo, igual que el Labor.status/startedAt de Atlas.
    @Column(nullable = false)
    private String status = "STOPPED"; // RUNNING | STOPPED

    private Instant startedAt;
}
