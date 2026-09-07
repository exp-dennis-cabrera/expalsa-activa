package com.tuempresa.cmms.dto.response;

import java.time.Instant;

public record FileResponse(
        Long id,
        String fileName,
        String downloadUrl,
        String contentType,
        Long sizeBytes,
        String uploadedByName,
        Instant createdAt
) {
}
