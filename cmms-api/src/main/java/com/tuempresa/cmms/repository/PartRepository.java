package com.tuempresa.cmms.repository;

import com.tuempresa.cmms.model.entity.Part;
import org.springframework.data.jpa.repository.JpaRepository;

public interface PartRepository extends JpaRepository<Part, Long> {
}
