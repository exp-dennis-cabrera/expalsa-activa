package com.tuempresa.cmms.controller;

import com.tuempresa.cmms.dto.request.SendTestEmailRequest;
import com.tuempresa.cmms.dto.request.UpdateMailSettingsRequest;
import com.tuempresa.cmms.dto.response.MailSettingsResponse;
import com.tuempresa.cmms.exception.ForbiddenOperationException;
import com.tuempresa.cmms.model.entity.MailSettings;
import com.tuempresa.cmms.model.enums.RoleNames;
import com.tuempresa.cmms.repository.MailSettingsRepository;
import com.tuempresa.cmms.security.CurrentUserProvider;
import com.tuempresa.cmms.service.mail.MailConfig;
import com.tuempresa.cmms.service.mail.MailConfigResolver;
import com.tuempresa.cmms.service.mail.MailServiceFactory;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

/**
 * Configuracion de correo por organizacion, editable en vivo desde
 * Ajustes -> Correo. Solo Admin puede verla/editarla.
 */
@RestController
@RequestMapping("/settings/mail")
@RequiredArgsConstructor
public class MailSettingsController {

    private final MailSettingsRepository mailSettingsRepository;
    private final MailConfigResolver mailConfigResolver;
    private final MailServiceFactory mailServiceFactory;
    private final CurrentUserProvider currentUser;

    @GetMapping
    public MailSettingsResponse get() {
        requireAdmin();
        MailSettings settings = findOrCreate();
        return toResponse(settings);
    }

    @PutMapping
    public MailSettingsResponse update(@Valid @RequestBody UpdateMailSettingsRequest request) {
        requireAdmin();
        MailSettings settings = findOrCreate();

        settings.setEnabled(request.enabled());
        settings.setMailType(request.mailType());
        settings.setFromEmail(request.fromEmail());
        settings.setFromName(request.fromName());
        settings.setSmtpHost(request.smtpHost());
        settings.setSmtpPort(request.smtpPort());
        settings.setSmtpUsername(request.smtpUsername());
        settings.setSmtpTrustAllCertificates(Boolean.TRUE.equals(request.smtpTrustAllCertificates()));

        // Si el campo llega vacio, se conserva el secreto guardado --
        // asi el formulario no necesita re-mostrar/reenviar la clave cada vez.
        if (request.sendgridApiKey() != null && !request.sendgridApiKey().isBlank()) {
            settings.setSendgridApiKey(request.sendgridApiKey());
        }
        if (request.smtpPassword() != null && !request.smtpPassword().isBlank()) {
            settings.setSmtpPassword(request.smtpPassword());
        }

        return toResponse(mailSettingsRepository.save(settings));
    }

    @PostMapping("/test")
    public void sendTest(@Valid @RequestBody SendTestEmailRequest request) {
        requireAdmin();
        MailConfig config = mailConfigResolver.resolve(currentUser.organizationId());
        String html = "<p>Este es un correo de prueba de configuracion de Mi CMMS.</p>";
        mailServiceFactory.getMailService(config.type())
                .sendHtml(config, request.toEmail(), "Correo de prueba - Mi CMMS", html);
    }

    private MailSettings findOrCreate() {
        return mailSettingsRepository.findByOrganizationId(currentUser.organizationId())
                .orElseGet(() -> {
                    MailSettings settings = new MailSettings();
                    settings.setOrganizationId(currentUser.organizationId());
                    return mailSettingsRepository.save(settings);
                });
    }

    private void requireAdmin() {
        String role = currentUser.get().getRoleName();
        if (!RoleNames.ADMIN.equalsIgnoreCase(role)) {
            throw new ForbiddenOperationException("Solo un administrador puede configurar el correo.");
        }
    }

    private MailSettingsResponse toResponse(MailSettings s) {
        return new MailSettingsResponse(
                Boolean.TRUE.equals(s.getEnabled()),
                s.getMailType(),
                s.getFromEmail(),
                s.getFromName(),
                s.getSendgridApiKey() != null && !s.getSendgridApiKey().isBlank(),
                s.getSmtpHost(),
                s.getSmtpPort(),
                s.getSmtpUsername(),
                s.getSmtpPassword() != null && !s.getSmtpPassword().isBlank(),
                Boolean.TRUE.equals(s.getSmtpTrustAllCertificates())
        );
    }
}
