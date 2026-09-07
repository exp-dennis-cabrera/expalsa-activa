package com.tuempresa.cmms.repository;

import com.tuempresa.cmms.model.entity.ShiftDay;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface ShiftDayRepository extends JpaRepository<ShiftDay, Long> {
    List<ShiftDay> findByUserId(Long userId);

    /**
     * Turnos de VARIOS usuarios en una sola consulta.
     *
     * Igual efecto que el original, donde la configuracion de turno cuelga
     * del usuario y ya viene cargada: el calculo de capacidad no consulta
     * la base ni una vez.
     */
    List<ShiftDay> findByUserIdIn(java.util.Collection<Long> userIds);
    Optional<ShiftDay> findByUserIdAndDayOfWeek(Long userId, String dayOfWeek);
}
