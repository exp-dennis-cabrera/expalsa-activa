package com.tuempresa.cmms.repository;

import com.tuempresa.cmms.model.entity.AssetDowntime;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.Instant;
import java.util.List;
import java.util.Optional;

public interface AssetDowntimeRepository extends JpaRepository<AssetDowntime, Long> {
    List<AssetDowntime> findByAssetIdOrderByStartsOnDesc(Long assetId);
    Optional<AssetDowntime> findFirstByAssetIdAndDurationSecondsIsNull(Long assetId);
}
