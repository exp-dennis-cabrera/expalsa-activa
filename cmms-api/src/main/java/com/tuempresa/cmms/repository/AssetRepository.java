package com.tuempresa.cmms.repository;

import com.tuempresa.cmms.model.entity.Asset;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

public interface AssetRepository extends JpaRepository<Asset, Long>,
        JpaSpecificationExecutor<Asset> {
    java.util.List<Asset> findByLocationId(Long locationId);

    /**
     * Hijos directos de un activo, paginados. Equivale a
     * findAssetChildren(id, pageable) del AssetService real: alimenta el
     * arbol que carga un nivel a la vez, al expandir.
     */
    org.springframework.data.domain.Page<Asset> findByParentAssetId(
            Long parentAssetId, org.springframework.data.domain.Pageable pageable);

    /** Copia fiel de countByParentAsset_Id real: alimenta hasChildren. */
    long countByParentAssetId(Long parentAssetId);

    /** Raiz del arbol: los que no cuelgan de nadie. */
    org.springframework.data.domain.Page<Asset> findByParentAssetIsNull(
            org.springframework.data.domain.Pageable pageable);
    java.util.Optional<Asset> findByBarCode(String barCode);
    java.util.Optional<Asset> findByNfcId(String nfcId);
}
