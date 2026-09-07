package com.tuempresa.cmms.service.mail;

import com.tuempresa.cmms.model.entity.MailSettings;
import com.tuempresa.cmms.repository.MailSettingsRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

/**
 * Resuelve la configuracion de correo a usar: primero busca configuracion
 * guardada en base de datos para la organizacion (editable desde Ajustes),
 * y si no existe, cae en las variables de entorno de application.yml.
 */
@Component
@RequiredArgsConstructor
public class MailConfigResolver {

    private final MailSettingsRepository mailSettingsRepository;

    @Value("${mail.enabled:false}")
    private boolean defaultEnabled;
    @Value("${mail.type:SMTP}")
    private String defaultType;
    @Value("${mail.from:no-reply@micmms.local}")
    private String defaultFrom;
    @Value("${mail.from-name:Mi CMMS}")
    private String defaultFromName;
    @Value("${sendgrid.api-key:}")
    private String defaultSendgridKey;
    @Value("${spring.mail.host:smtp.gmail.com}")
    private String defaultSmtpHost;
    @Value("${spring.mail.port:587}")
    private Integer defaultSmtpPort;
    @Value("${spring.mail.username:}")
    private String defaultSmtpUsername;
    @Value("${spring.mail.password:}")
    private String defaultSmtpPassword;

    public MailConfig resolve(Long organizationId) {
        return mailSettingsRepository.findByOrganizationId(organizationId)
                .map(this::fromEntity)
                .orElseGet(this::fromDefaults);
    }

    private MailConfig fromEntity(MailSettings s) {
        return new MailConfig(
                Boolean.TRUE.equals(s.getEnabled()),
                s.getMailType(),
                blankToDefault(s.getFromEmail(), defaultFrom),
                blankToDefault(s.getFromName(), defaultFromName),
                blankToDefault(s.getSendgridApiKey(), defaultSendgridKey),
                blankToDefault(s.getSmtpHost(), defaultSmtpHost),
                s.getSmtpPort() != null ? s.getSmtpPort() : defaultSmtpPort,
                blankToDefault(s.getSmtpUsername(), defaultSmtpUsername),
                blankToDefault(s.getSmtpPassword(), defaultSmtpPassword),
                Boolean.TRUE.equals(s.getSmtpTrustAllCertificates())
        );
    }

    private MailConfig fromDefaults() {
        return new MailConfig(defaultEnabled, defaultType, defaultFrom, defaultFromName, defaultSendgridKey,
                defaultSmtpHost, defaultSmtpPort, defaultSmtpUsername, defaultSmtpPassword, false);
    }

    private String blankToDefault(String value, String fallback) {
        return (value != null && !value.isBlank()) ? value : fallback;
    }
}
