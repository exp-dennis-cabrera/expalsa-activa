package com.tuempresa.cmms.repository;

import com.tuempresa.cmms.model.entity.MeterDevice;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface MeterDeviceRepository extends JpaRepository<MeterDevice, Long> {

    /** El equipo instalado ahora: el unico sin fecha de retiro. */
    Optional<MeterDevice> findByMeterIdAndRemovedAtIsNull(Long meterId);

    /** Historial completo de equipos de un medidor, del mas antiguo al actual. */
    List<MeterDevice> findByMeterIdOrderByInstalledAtAsc(Long meterId);
}
