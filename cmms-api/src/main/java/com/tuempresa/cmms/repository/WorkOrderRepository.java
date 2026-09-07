package com.tuempresa.cmms.repository;

import com.tuempresa.cmms.model.entity.WorkOrder;
import com.tuempresa.cmms.model.enums.WorkOrderStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.Instant;
import java.util.List;

public interface WorkOrderRepository extends JpaRepository<WorkOrder, Long>,
        JpaSpecificationExecutor<WorkOrder> {

    long countByCreatedByIdAndOrganizationId(Long createdById, Long organizationId);

    @Query("SELECT w FROM WorkOrder w WHERE w.createdAt >= :start AND w.createdAt < :end")
    List<WorkOrder> findByCreatedAtBetween(@Param("start") Instant start, @Param("end") Instant end);

    long countByCreatedByIdAndOrganizationIdAndStatus(Long createdById, Long organizationId, WorkOrderStatus status);

    // BETWEEN es inclusivo en ambos extremos -- eso duplicaba ordenes cuando
    // dos ventanas de tiempo consecutivas comparten un limite exacto (ej. un
    // turno que termina a las 07:00 y el siguiente que empieza a las 07:00).
    // Con [inicio, fin) cada instante pertenece a una sola ventana.
    @Query("SELECT w FROM WorkOrder w WHERE w.dueDate >= :start AND w.dueDate < :end")
    List<WorkOrder> findByDueDateBetween(@Param("start") Instant start, @Param("end") Instant end);

    @Query("SELECT w FROM WorkOrder w WHERE w.estimatedStartDate >= :start AND w.estimatedStartDate < :end")
    List<WorkOrder> findByEstimatedStartDateBetween(@Param("start") Instant start, @Param("end") Instant end);

    @Query("SELECT w FROM WorkOrder w WHERE w.estimatedStartDate IS NULL AND w.status <> 'COMPLETED'")
    List<WorkOrder> findUnscheduled();

    @Query("SELECT w FROM WorkOrder w WHERE w.asset.id = :assetId ORDER BY w.createdAt DESC")
    List<WorkOrder> findByAssetId(@Param("assetId") Long assetId);

    @Query("SELECT w FROM WorkOrder w WHERE w.location.id = :locationId ORDER BY w.createdAt DESC")
    List<WorkOrder> findByLocationId(@Param("locationId") Long locationId);

    @Query("SELECT w FROM WorkOrder w WHERE w.primaryAssignee.id = :userId AND w.estimatedStartDate >= :start AND w.estimatedStartDate < :end")
    List<WorkOrder> findByPrimaryAssigneeAndEstimatedStartDateBetween(
            @Param("userId") Long userId, @Param("start") Instant start, @Param("end") Instant end);

    @Query("SELECT w FROM WorkOrder w WHERE w.parentPreventiveMaintenance.id = :pmId ORDER BY w.createdAt DESC")
    List<WorkOrder> findByParentPreventiveMaintenanceId(@Param("pmId") Long pmId);

    /**
     * Siguiente numero para el identificador visible (WO000001).
     *
     * Se usa una secuencia de PostgreSQL en vez de count() + 1: dos
     * creaciones simultaneas obtenian el mismo numero, y al borrar una orden
     * el contador reutilizaba codigos ya usados.
     */
    @org.springframework.data.jpa.repository.Query(
            value = "SELECT nextval('work_order_custom_id_seq')", nativeQuery = true)
    Long nextCustomIdSequence();
}
