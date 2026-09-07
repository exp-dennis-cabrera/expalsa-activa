package com.tuempresa.cmms.repository;

import com.tuempresa.cmms.model.entity.MaterialRequest;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface MaterialRequestRepository extends JpaRepository<MaterialRequest, Long> {
    List<MaterialRequest> findByWorkOrderIdOrderByCreatedAtDesc(Long workOrderId);
}
