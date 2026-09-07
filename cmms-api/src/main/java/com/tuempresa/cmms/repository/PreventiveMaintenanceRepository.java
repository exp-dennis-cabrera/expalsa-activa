package com.tuempresa.cmms.repository;

import com.tuempresa.cmms.model.entity.PreventiveMaintenance;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.List;

public interface PreventiveMaintenanceRepository extends JpaRepository<PreventiveMaintenance, Long> {

    @Query("SELECT pm FROM PreventiveMaintenance pm WHERE pm.schedule.disabled = false")
    List<PreventiveMaintenance> findAllActive();
}
