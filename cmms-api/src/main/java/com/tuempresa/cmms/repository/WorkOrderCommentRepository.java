package com.tuempresa.cmms.repository;

import com.tuempresa.cmms.model.entity.WorkOrderComment;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface WorkOrderCommentRepository extends JpaRepository<WorkOrderComment, Long> {
    List<WorkOrderComment> findByWorkOrderIdOrderByCreatedAtAsc(Long workOrderId);
}
