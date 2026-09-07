package com.tuempresa.cmms.service;

import com.tuempresa.cmms.model.entity.PreventiveMaintenance;
import com.tuempresa.cmms.model.entity.User;
import com.tuempresa.cmms.service.mail.MailConfig;
import com.tuempresa.cmms.service.mail.MailConfigResolver;
import com.tuempresa.cmms.service.mail.MailServiceFactory;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * Igual que PreventiveMaintenanceNotificationJob real de Atlas: avisa por
 * correo N dias antes de que un PM vaya a generar su proxima orden --
 * separado del correo/aviso que ocurre cuando la orden ya se genero.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class PreventiveMaintenanceMailService {

    private final MailConfigResolver mailConfigResolver;
    private final MailServiceFactory mailServiceFactory;

    @Value("${frontend.url:http://localhost:3000}")
    private String frontendUrl;

    public void sendUpcomingNotification(PreventiveMaintenance pm, List<User> recipients) {
        MailConfig config = mailConfigResolver.resolve(pm.getOrganizationId());
        if (!config.enabled() || recipients.isEmpty()) return;

        // Deduplicar por email, igual que el Collectors.toMap real de Atlas
        Map<String, User> byEmail = new LinkedHashMap<>();
        recipients.forEach(u -> byEmail.putIfAbsent(u.getEmail(), u));

        String subject = "Próxima orden de trabajo: " + pm.getTitle();
        String link = frontendUrl + "/preventive-maintenance";
        String html = """
                <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto;">
                    <h2 style="color:#1e3a5f;">Próxima orden de mantenimiento</h2>
                    <p>El mantenimiento preventivo <strong>%s</strong> generará una nueva orden de trabajo pronto.</p>
                    <p style="margin: 24px 0;">
                        <a href="%s" style="background:#5b6df8;color:#fff;padding:12px 24px;
                        border-radius:6px;text-decoration:none;font-weight:bold;">Ver mantenimiento preventivo</a>
                    </p>
                </div>
                """.formatted(pm.getTitle(), link);

        List<String> emails = new ArrayList<>(byEmail.keySet());
        for (String email : emails) {
            try {
                mailServiceFactory.getMailService(config.type()).sendHtml(config, email, subject, html);
            } catch (Exception e) {
                log.error("No se pudo enviar aviso de PM a {}: {}", email, e.getMessage());
            }
        }
    }
}
