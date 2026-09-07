package com.tuempresa.cmms.repository;

import com.tuempresa.cmms.model.entity.Vendor;
import org.springframework.data.jpa.repository.JpaRepository;

public interface VendorRepository extends JpaRepository<Vendor, Long> {
}
