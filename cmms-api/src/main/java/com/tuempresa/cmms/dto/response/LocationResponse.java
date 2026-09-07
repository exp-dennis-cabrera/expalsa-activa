package com.tuempresa.cmms.dto.response;

import java.time.Instant;
import java.util.List;

public record LocationResponse(
        Long id,
        String customId,
        String name,
        String address,
        Double latitude,
        Double longitude,
        String imageUrl,
        Long parentLocationId,
        String parentLocationName,
        List<IdName> assignedUsers,
        List<IdName> teams,
        List<IdName> vendors,
        Instant createdAt
) {
    public record IdName(Long id, String name) {
    }
}
