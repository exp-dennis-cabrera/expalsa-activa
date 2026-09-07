package com.tuempresa.cmms.dto.response;

import java.util.List;

public record TeamResponse(
        Long id,
        String name,
        String description,
        Long createdById,
        List<UserSummary> members,
        List<AssetSummaryLite> assets,
        List<LocationSummary> locations,
        List<PartSummary> parts
) {
    public record AssetSummaryLite(Long id, String name) {
    }
}
