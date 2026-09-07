package com.tuempresa.cmms.repository;

import com.tuempresa.cmms.model.entity.Request;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.List;

public interface RequestRepository extends JpaRepository<Request, Long> {

    @Query("SELECT r FROM Request r ORDER BY r.createdAt DESC")
    List<Request> findAllOrderByCreatedAtDesc();

    @Query("SELECT COUNT(r) FROM Request r WHERE r.workOrder IS NULL AND r.cancelled = false")
    long countPending();
}
