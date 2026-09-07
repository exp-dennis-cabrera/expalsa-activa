package com.tuempresa.cmms.model.entity;

import com.tuempresa.cmms.tenant.BaseTenantEntity;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDate;

/**
 * Copia fiel de ShiftException real: una fecha puntual que manda sobre el
 * turno semanal de una persona.
 *
 * Sirve para vacaciones, feriados, capacitaciones o media jornada. Sin
 * esto, el planificador muestra a alguien de vacaciones con capacidad
 * completa y las barras en verde, cuando en realidad no esta.
 *
 * Si enabled = false, ese dia no trabaja (capacidad 0), sin importar el
 * turno semanal. Si es true, se usan los minutos indicados.
 */
@Entity
@Table(name = "shift_exceptions",
       uniqueConstraints = @UniqueConstraint(columnNames = {"user_id", "exception_date"}))
@Getter
@Setter
public class ShiftException extends BaseTenantEntity {

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Column(name = "exception_date", nullable = false)
    private LocalDate exceptionDate;

    /** Minutos disponibles ese dia. Se ignora si enabled = false. */
    @Column(nullable = false)
    private Integer availabilityMinutes = 0;

    /** false = no trabaja ese dia (vacaciones, feriado). */
    @Column(nullable = false)
    private Boolean enabled = false;

    /** Motivo visible en la interfaz: "Vacaciones", "Feriado", "Capacitacion". */
    private String reason;
}
