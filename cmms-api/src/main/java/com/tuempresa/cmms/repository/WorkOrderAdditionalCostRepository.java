package com.tuempresa.cmms.repository;

import com.tuempresa.cmms.model.entity.WorkOrderAdditionalCost;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface WorkOrderAdditionalCostRepository extends JpaRepository<WorkOrderAdditionalCost, Long> {
    List<WorkOrderAdditionalCost> findByWorkOrderId(Long workOrderId);
}
