package com.tuempresa.cmms.model.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.Setter;

@Entity
@Table(name = "organizations")
@Getter
@Setter
public class Organization extends BaseEntity {

    @Column(nullable = false)
    private String name;

    @Column(unique = true)
    private String subdomain;

    private String timezone = "America/Guayaquil";

    private String subscriptionPlan = "FREE";

    /**
     * Hora limite (0-23) para registrar las lecturas del dia.
     *
     * Las lecturas se toman en el turno nocturno, entre las 00:00 y esta
     * hora. Antes del limite, un medidor sin leer esta PENDIENTE (normal,
     * el turno sigue trabajando); despues del limite pasa a INCUMPLIDO
     * (nadie lo registro en su ventana).
     *
     * Sin esto solo habria "vencido", y un supervisor a las 8 AM no podria
     * distinguir un turno que va normal de uno que fallo.
     */
    private Integer readingDeadlineHour = 7;

    /**
     * Horarios de los dos turnos de la planta.
     *
     * Se guardan aca, a nivel de organizacion, para poder cambiarlos desde
     * Ajustes sin tocar el turno de cada persona una por una. Al asignar un
     * turno en Personas se ofrecen estos horarios como plantilla.
     */
    private java.time.LocalTime dayShiftStart = java.time.LocalTime.of(7, 0);
    private java.time.LocalTime dayShiftEnd = java.time.LocalTime.of(19, 0);
    private java.time.LocalTime nightShiftStart = java.time.LocalTime.of(19, 0);
    private java.time.LocalTime nightShiftEnd = java.time.LocalTime.of(7, 0);
}
