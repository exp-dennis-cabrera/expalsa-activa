package com.tuempresa.cmms.dto.request;

import com.tuempresa.cmms.model.enums.AssetStatus;
import jakarta.validation.constraints.NotBlank;

import java.time.LocalDate;
import java.util.Set;

public record UpdateAssetRequest(
        @NotBlank String name,
        String description,
        AssetStatus status,
        Long categoryId,
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
        Long parentAssetId,
        Long primaryUserId,
        Set<Long> assignedUserIds,
        Set<Long> teamIds,
        Set<Long> vendorIds,
        Set<Long> partIds,
        DeprecationInput deprecation
) {
    public record DeprecationInput(
            Double purchasePrice, LocalDate purchaseDate, Double residualValue,
            String usefulLife, Integer rate, Double currentValue
    ) {
    }
}
