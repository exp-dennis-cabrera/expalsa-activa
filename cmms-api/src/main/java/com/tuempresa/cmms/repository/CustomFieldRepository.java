package com.tuempresa.cmms.repository;

import com.tuempresa.cmms.model.entity.CustomField;
import com.tuempresa.cmms.model.enums.CustomFieldEntityType;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface CustomFieldRepository extends JpaRepository<CustomField, Long> {
    List<CustomField> findByEntityType(CustomFieldEntityType entityType);
}
