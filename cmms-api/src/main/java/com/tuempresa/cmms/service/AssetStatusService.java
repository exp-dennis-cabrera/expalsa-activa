package com.tuempresa.cmms.service;

import com.tuempresa.cmms.model.entity.Asset;
import com.tuempresa.cmms.model.entity.AssetDowntime;
import com.tuempresa.cmms.model.enums.AssetStatus;
import com.tuempresa.cmms.repository.AssetDowntimeRepository;
import com.tuempresa.cmms.repository.AssetRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.time.temporal.ChronoUnit;

/**
 * Extraido aparte (no dentro de AssetService) para que tanto AssetService
 * como WorkOrderService puedan usarlo sin crear una dependencia circular
 * entre ambos. Cambia el estado de un activo y abre/cierra automaticamente
 * un periodo de inactividad segun corresponda -- igual logica que el
 * dispatchAssetStatusChangeWebhook real de Atlas.
 */
@Service
@RequiredArgsConstructor
public class AssetStatusService {

    private final AssetRepository assetRepository;
    private final AssetDowntimeRepository assetDowntimeRepository;

    public void changeStatus(Asset asset, AssetStatus newStatus) {
        AssetStatus previous = asset.getStatus();
        if (previous == newStatus) return;

        asset.setStatus(newStatus);
        assetRepository.save(asset);

        if (!previous.isReallyDown() && newStatus.isReallyDown()) {
            startDowntime(asset);
        } else if (previous.isReallyDown() && !newStatus.isReallyDown()) {
            closeOpenDowntime(asset);
        }
    }

    public AssetStatus parseOrDefault(String status, AssetStatus fallback) {
        if (status == null || status.isBlank()) return fallback;
        try {
            return AssetStatus.valueOf(status);
        } catch (IllegalArgumentException e) {
            return fallback;
        }
    }

    private void startDowntime(Asset asset) {
        if (assetDowntimeRepository.findFirstByAssetIdAndDurationSecondsIsNull(asset.getId()).isPresent()) return;
        AssetDowntime downtime = new AssetDowntime();
        downtime.setOrganizationId(asset.getOrganizationId());
        downtime.setAsset(asset);
        downtime.setStartsOn(Instant.now());
        assetDowntimeRepository.save(downtime);
    }

    private void closeOpenDowntime(Asset asset) {
        assetDowntimeRepository.findFirstByAssetIdAndDurationSecondsIsNull(asset.getId()).ifPresent(downtime -> {
            downtime.setDurationSeconds(ChronoUnit.SECONDS.between(downtime.getStartsOn(), Instant.now()));
            assetDowntimeRepository.save(downtime);
        });
    }
}
