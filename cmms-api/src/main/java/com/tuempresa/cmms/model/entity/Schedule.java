package com.tuempresa.cmms.model.entity;

import com.tuempresa.cmms.model.enums.RecurrenceBasedOn;
import com.tuempresa.cmms.model.enums.RecurrenceType;
import com.tuempresa.cmms.tenant.BaseTenantEntity;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

/**
 * Igual que Schedule.java real de Atlas: reglas de recurrencia de un
 * Mantenimiento Preventivo.
 */
@Entity
@Table(name = "schedules")
@Getter
@Setter
public class Schedule extends BaseTenantEntity {

    private Boolean disabled = false;

    @Column(nullable = false)
    private Instant startsOn = Instant.now();

    @Column(nullable = false)
    private Integer frequency = 1;

    private Instant endsOn;

    // Dias de mas de vencimiento despues de generada la orden (dueDate = generada + delay)
    private Integer dueDateDelay;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private RecurrenceType recurrenceType = RecurrenceType.DAILY;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private RecurrenceBasedOn recurrenceBasedOn = RecurrenceBasedOn.SCHEDULED_DATE;

    // 0 = lunes .. 6 = domingo, igual que Atlas real
    @ElementCollection
    @CollectionTable(name = "schedule_days_of_week", joinColumns = @JoinColumn(name = "schedule_id"))
    @Column(name = "day_of_week")
    private List<Integer> daysOfWeek = new ArrayList<>();
}
