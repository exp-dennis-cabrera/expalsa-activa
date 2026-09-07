package com.tuempresa.cmms.repository;

import com.tuempresa.cmms.model.envers.WorkOrderAud;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface WorkOrderAudRepository extends JpaRepository<WorkOrderAud, Long> {

    /** Copia fiel de findByIdAndRevtype real: revtype 1 = modificaciones. */
    @Query("SELECT w FROM WorkOrderAud w WHERE w.workOrderAudId.id = :id AND w.revtype = :revType " +
           "ORDER BY w.workOrderAudId.rev.timestamp DESC")
    List<WorkOrderAud> findByIdAndRevtype(@Param("id") Long id, @Param("revType") Integer revType);
}
