package com.tuempresa.cmms.service;

import com.tuempresa.cmms.service.mail.MailConfig;
import com.tuempresa.cmms.service.mail.MailConfigResolver;
import com.tuempresa.cmms.service.mail.MailServiceFactory;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
@Slf4j
public class AuthMailService {

    private final MailConfigResolver mailConfigResolver;
    private final MailServiceFactory mailServiceFactory;

    @Value("${frontend.url:http://localhost:3000}")
    private String frontendUrl;

    @Async
    public void sendVerificationEmail(Long organizationId, String toEmail, String token) {
        String url = frontendUrl + "/verify-email?token=" + token;
        send(organizationId, toEmail, "Confirmá tu correo — Expalsa Activa", """
                <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto;">
                    <h2 style="color:#0F1B3D;">Confirmá tu correo</h2>
                    <p>Creaste una cuenta en Expalsa Activa. Confirmá que este correo es tuyo:</p>
                    <p style="margin: 24px 0;">
                        <a href="%s" style="background:#5b6df8;color:#fff;padding:12px 24px;
                        border-radius:6px;text-decoration:none;font-weight:bold;">Confirmar mi correo</a>
                    </p>
                    <p style="color:#888;font-size:13px;">Si el botón no funciona, copiá este link: %s</p>
                    <p style="color:#888;font-size:13px;">Este link vence en 24 horas.</p>
                </div>
                """.formatted(url, url));
    }

    @Async
    public void sendPasswordResetEmail(Long organizationId, String toEmail, String token) {
        String url = frontendUrl + "/reset-password?token=" + token;
        send(organizationId, toEmail, "Recuperar contraseña — Expalsa Activa", """
                <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto;">
                    <h2 style="color:#0F1B3D;">Recuperar tu contraseña</h2>
                    <p>Solicitaste restablecer tu contraseña. Si no fuiste tú, puedes ignorar este correo.</p>
                    <p style="margin: 24px 0;">
                        <a href="%s" style="background:#5b6df8;color:#fff;padding:12px 24px;
                        border-radius:6px;text-decoration:none;font-weight:bold;">Elegir una contraseña nueva</a>
                    </p>
                    <p style="color:#888;font-size:13px;">Si el botón no funciona, copiá este link: %s</p>
                    <p style="color:#888;font-size:13px;">Este link vence en 30 minutos y solo se puede usar una vez.</p>
                </div>
                """.formatted(url, url));
    }

    private void send(Long organizationId, String toEmail, String subject, String html) {
        MailConfig config = mailConfigResolver.resolve(organizationId);
        if (!config.enabled()) {
            log.info("Correo deshabilitado para esta organización. Asunto \"{}\" -> {}", subject, toEmail);
            return;
        }
        mailServiceFactory.getMailService(config.type()).sendHtml(config, toEmail, subject, html);
    }
}
