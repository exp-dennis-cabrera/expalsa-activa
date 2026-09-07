package com.tuempresa.cmms.repository;

import com.tuempresa.cmms.model.entity.CustomFieldValue;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface CustomFieldValueRepository extends JpaRepository<CustomFieldValue, Long> {
    List<CustomFieldValue> findByWorkOrderId(Long workOrderId);
    List<CustomFieldValue> findByPreventiveMaintenanceId(Long pmId);

    /** Para el upsert: si ya hay valor para ese campo, se actualiza. */
    java.util.Optional<CustomFieldValue> findByWorkOrderIdAndCustomFieldId(Long workOrderId, Long customFieldId);

    java.util.Optional<CustomFieldValue> findByPreventiveMaintenanceIdAndCustomFieldId(Long pmId, Long customFieldId);
}
