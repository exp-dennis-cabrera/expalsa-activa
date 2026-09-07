package com.tuempresa.cmms.repository;

import com.tuempresa.cmms.model.entity.FloorPlan;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface FloorPlanRepository extends JpaRepository<FloorPlan, Long> {
    List<FloorPlan> findByLocationId(Long locationId);
}
