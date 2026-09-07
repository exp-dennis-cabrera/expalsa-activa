package com.tuempresa.cmms.repository;

import com.tuempresa.cmms.model.entity.Meter;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface MeterRepository extends JpaRepository<Meter, Long> {
    List<Meter> findByAssetId(Long assetId);
}
