package com.tuempresa.cmms.dto.request;

import jakarta.validation.constraints.NotNull;

public record UpdateMailSettingsRequest(
        @NotNull Boolean enabled,
        @NotNull String mailType,
        String fromEmail,
        String fromName,
        String sendgridApiKey,
        String smtpHost,
        Integer smtpPort,
        String smtpUsername,
        String smtpPassword,
        Boolean smtpTrustAllCertificates
) {
}
