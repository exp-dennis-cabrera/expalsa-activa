package com.tuempresa.cmms.dto.response;

import com.tuempresa.cmms.model.enums.AssetStatus;

import java.time.Instant;
import java.time.LocalDate;
import java.util.List;

public record AssetResponse(
        Long id,
        String customId,
        String name,
        String description,
        AssetStatus status,
        Long categoryId,
        String categoryName,
        String serialNumber,
        String model,
        String manufacturer,
        String power,
        String area,
        String barCode,
        String nfcId,
        LocalDate acquisitionDate,
        Double acquisitionCost,
        LocalDate warrantyExpirationDate,
        LocalDate inServiceDate,
        String additionalInfos,
        String imageUrl,
        Long locationId,
        String locationName,
        Long parentAssetId,
        String parentAssetName,
        Long primaryUserId,
        String primaryUserName,
        List<IdName> assignedUsers,
        List<IdName> teams,
        List<IdName> vendors,
        List<IdName> parts,
        DeprecationResponse deprecation,
        Instant createdAt,
        Instant updatedAt
,
        /** Igual que hasChildren real: si tiene subactivos, para el arbol. */
        Boolean hasChildren) {
    public record IdName(Long id, String name) {
    }

    public record DeprecationResponse(
            Double purchasePrice, LocalDate purchaseDate, Double residualValue,
            String usefulLife, Integer rate, Double currentValue
    ) {
    }
}
