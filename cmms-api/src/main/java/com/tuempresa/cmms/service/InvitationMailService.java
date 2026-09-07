package com.tuempresa.cmms.service;

import com.tuempresa.cmms.service.mail.MailConfig;
import com.tuempresa.cmms.service.mail.MailConfigResolver;
import com.tuempresa.cmms.service.mail.MailServiceFactory;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

/**
 * Construye y envia el email de invitacion. El organizationId se recibe
 * como parametro (capturado sincronicamente por el caller) porque este
 * metodo corre @Async en otro hilo, donde el SecurityContext/CurrentUserProvider
 * de la request original ya no esta disponible.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class InvitationMailService {

    private final MailConfigResolver mailConfigResolver;
    private final MailServiceFactory mailServiceFactory;

    @Async
    public void sendInvitationEmail(Long organizationId, String toEmail, String inviterName,
                                     String organizationName, String acceptUrl) {
        MailConfig config = mailConfigResolver.resolve(organizationId);
        if (!config.enabled()) {
            log.info("Correo deshabilitado para esta organizacion. Invitacion para {} -> {}", toEmail, acceptUrl);
            return;
        }
        String subject = inviterName + " te invito a unirte a " + organizationName + " en Mi CMMS";
        String html = buildHtml(inviterName, organizationName, acceptUrl);
        mailServiceFactory.getMailService(config.type()).sendHtml(config, toEmail, subject, html);
    }

    private String buildHtml(String inviterName, String organizationName, String acceptUrl) {
        return """
                <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto;">
                    <h2 style="color:#1e3a5f;">Te invitaron a Mi CMMS</h2>
                    <p><strong>%s</strong> te invito a unirte a <strong>%s</strong>.</p>
                    <p style="margin: 24px 0;">
                        <a href="%s" style="background:#5b6df8;color:#fff;padding:12px 24px;
                        border-radius:6px;text-decoration:none;font-weight:bold;">Crear mi cuenta</a>
                    </p>
                    <p style="color:#888;font-size:13px;">Si el boton no funciona, copia este link: %s</p>
                </div>
                """.formatted(inviterName, organizationName, acceptUrl, acceptUrl);
    }
}
