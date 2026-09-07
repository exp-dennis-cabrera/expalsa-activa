package com.tuempresa.cmms.repository;

import com.tuempresa.cmms.model.entity.MeterReading;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface MeterReadingRepository extends JpaRepository<MeterReading, Long> {
    List<MeterReading> findByMeterIdOrderByReadingDateDesc(Long meterId);

    /** Cuantas lecturas dio un equipo fisico. Alimenta la pestaña Reemplazos. */
    long countByDeviceId(Long deviceId);
}
