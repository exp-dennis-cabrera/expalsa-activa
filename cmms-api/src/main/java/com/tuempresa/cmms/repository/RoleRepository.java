package com.tuempresa.cmms.repository;

import com.tuempresa.cmms.model.entity.Role;
import org.springframework.data.jpa.repository.JpaRepository;

public interface RoleRepository extends JpaRepository<Role, Long> {
    java.util.List<Role> findByOrganizationId(Long organizationId);
}
