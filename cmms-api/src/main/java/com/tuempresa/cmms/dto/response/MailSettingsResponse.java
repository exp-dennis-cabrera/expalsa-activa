package com.tuempresa.cmms.dto.response;

public record MailSettingsResponse(
        boolean enabled,
        String mailType,
        String fromEmail,
        String fromName,
        boolean sendgridApiKeySet,
        String smtpHost,
        Integer smtpPort,
        String smtpUsername,
        boolean smtpPasswordSet,
        boolean smtpTrustAllCertificates
) {
}
