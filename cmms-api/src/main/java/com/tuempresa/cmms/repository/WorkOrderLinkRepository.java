package com.tuempresa.cmms.repository;

import com.tuempresa.cmms.model.entity.WorkOrderLink;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface WorkOrderLinkRepository extends JpaRepository<WorkOrderLink, Long> {

    @Query("SELECT l FROM WorkOrderLink l WHERE l.workOrder.id = :id OR l.linkedWorkOrder.id = :id")
    List<WorkOrderLink> findAllInvolving(@Param("id") Long workOrderId);
}
