package com.tuempresa.cmms.repository;

import com.tuempresa.cmms.model.entity.WorkOrderTimeLog;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface WorkOrderTimeLogRepository extends JpaRepository<WorkOrderTimeLog, Long> {
    List<WorkOrderTimeLog> findByWorkOrderId(Long workOrderId);
}
