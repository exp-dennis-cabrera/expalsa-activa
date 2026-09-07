package com.tuempresa.cmms.repository;

import com.tuempresa.cmms.model.entity.WorkOrderStatusHistory;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.Instant;
import java.util.List;
import java.util.Optional;

public interface WorkOrderStatusHistoryRepository extends JpaRepository<WorkOrderStatusHistory, Long> {

    /** Historial completo de una orden, para mostrarlo como comentarios. */
    List<WorkOrderStatusHistory> findByWorkOrderIdOrderByChangedAtAsc(Long workOrderId);

    @Query("SELECT h FROM WorkOrderStatusHistory h WHERE h.workOrder.id = :workOrderId AND h.changedAt <= :asOf " +
            "ORDER BY h.changedAt DESC, h.id DESC")
    List<WorkOrderStatusHistory> findLatestAsOf(@Param("workOrderId") Long workOrderId, @Param("asOf") Instant asOf);

    default Optional<WorkOrderStatusHistory> findFirstLatestAsOf(Long workOrderId, Instant asOf) {
        List<WorkOrderStatusHistory> results = findLatestAsOf(workOrderId, asOf);
        return results.isEmpty() ? Optional.empty() : Optional.of(results.get(0));
    }
}
