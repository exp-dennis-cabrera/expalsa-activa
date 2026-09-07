package com.tuempresa.cmms.repository;

import com.tuempresa.cmms.model.entity.MeterTrigger;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface MeterTriggerRepository extends JpaRepository<MeterTrigger, Long> {
    List<MeterTrigger> findByMeterId(Long meterId);
}
