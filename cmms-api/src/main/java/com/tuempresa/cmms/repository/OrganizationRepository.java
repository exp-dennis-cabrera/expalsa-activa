package com.tuempresa.cmms.repository;

import com.tuempresa.cmms.model.entity.Organization;
import org.springframework.data.jpa.repository.JpaRepository;

public interface OrganizationRepository extends JpaRepository<Organization, Long> {
}
