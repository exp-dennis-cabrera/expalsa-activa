package com.tuempresa.cmms.service.mail;

import jakarta.mail.internet.MimeMessage;
import lombok.extern.slf4j.Slf4j;
import org.springframework.mail.javamail.JavaMailSenderImpl;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;

@Service
@Slf4j
public class SmtpMailService implements MailService {

    @Override
    public void sendHtml(MailConfig config, String toEmail, String subject, String htmlBody) {
        try {
            JavaMailSenderImpl sender = new JavaMailSenderImpl();
            sender.setHost(config.smtpHost());
            sender.setPort(config.smtpPort() != null ? config.smtpPort() : 587);
            sender.setUsername(config.smtpUsername());
            sender.setPassword(config.smtpPassword());
            sender.getJavaMailProperties().put("mail.smtp.auth", "true");
            sender.getJavaMailProperties().put("mail.smtp.starttls.enable", "true");

            if (config.smtpTrustAllCertificates()) {
                // "ssl.trust=*" evita el problema de cadena de confianza (CA
                // desconocida); "ssl.checkserveridentity=false" evita el chequeo
                // de que el nombre del certificado (SAN) coincida exactamente con
                // el host -- necesario para certificados autofirmados que no
                // incluyen el hostname real del servidor interno.
                sender.getJavaMailProperties().put("mail.smtp.ssl.trust", "*");
                sender.getJavaMailProperties().put("mail.smtp.ssl.checkserveridentity", "false");
            }

            MimeMessage message = sender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");
            helper.setTo(toEmail);
            if (config.fromName() != null && !config.fromName().isBlank()) {
                helper.setFrom(config.fromEmail(), config.fromName());
            } else {
                helper.setFrom(config.fromEmail());
            }
            helper.setSubject(subject);
            helper.setText(htmlBody, true);
            sender.send(message);
            log.info("Email (SMTP) enviado a {}", toEmail);
        } catch (Exception e) {
            log.error("Error enviando email por SMTP a {}: {}", toEmail, e.getMessage());
            throw new RuntimeException("No se pudo enviar el correo por SMTP: " + e.getMessage(), e);
        }
    }
}
