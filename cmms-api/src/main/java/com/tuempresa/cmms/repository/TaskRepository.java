package com.tuempresa.cmms.repository;

import com.tuempresa.cmms.model.entity.Task;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface TaskRepository extends JpaRepository<Task, Long> {
    List<Task> findByWorkOrderIdOrderByOrderIndexAsc(Long workOrderId);
    List<Task> findByPreventiveMaintenanceIdOrderByOrderIndexAsc(Long preventiveMaintenanceId);
}
