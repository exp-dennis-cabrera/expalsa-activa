package com.tuempresa.cmms.service.mail;

public record MailConfig(
        boolean enabled,
        String type,
        String fromEmail,
        String fromName,
        String sendgridApiKey,
        String smtpHost,
        Integer smtpPort,
        String smtpUsername,
        String smtpPassword,
        boolean smtpTrustAllCertificates
) {
}
