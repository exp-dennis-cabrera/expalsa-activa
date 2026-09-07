package com.tuempresa.cmms.model.entity;

import com.tuempresa.cmms.tenant.BaseTenantEntity;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalTime;

/**
 * Turno de una persona para un dia de la semana, con hora de inicio y fin
 * reales -- si endTime es anterior a startTime, el turno cruza la medianoche
 * (ej. 18:00 a 07:00 del dia siguiente = turno nocturno). El turno se
 * "atribuye" al dia en que empieza, aunque termine calendario adentro del
 * dia siguiente.
 */
@Entity
@Table(name = "shift_days")
@Getter
@Setter
public class ShiftDay extends BaseTenantEntity {

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Column(nullable = false)
    private String dayOfWeek; // MONDAY..SUNDAY (java.time.DayOfWeek.name())

    @Column(nullable = false)
    private Boolean enabled = false;

    private LocalTime startTime;
    private LocalTime endTime;

    /**
     * Duracion real del turno en minutos, manejando el cruce de medianoche
     * (ej. 18:00 -> 07:00 = 13h = 780 min, no un numero negativo).
     */
    @Transient
    public int getDurationMinutes() {
        if (startTime == null || endTime == null) return 0;
        int start = startTime.toSecondOfDay() / 60;
        int end = endTime.toSecondOfDay() / 60;
        if (end > start) return end - start;
        if (end < start) return (24 * 60 - start) + end; // cruza medianoche
        return 24 * 60; // inicio == fin -> turno doble continuo de 24h
    }

    @Transient
    public boolean crossesMidnight() {
        return startTime != null && endTime != null && !endTime.isAfter(startTime);
    }
}
