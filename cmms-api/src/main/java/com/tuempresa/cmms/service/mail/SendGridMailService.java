package com.tuempresa.cmms.service.mail;

import com.sendgrid.Method;
import com.sendgrid.Request;
import com.sendgrid.Response;
import com.sendgrid.SendGrid;
import com.sendgrid.helpers.mail.Mail;
import com.sendgrid.helpers.mail.objects.Content;
import com.sendgrid.helpers.mail.objects.Email;
import com.sendgrid.helpers.mail.objects.Personalization;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

/**
 * Igual que el SendgridService real de Atlas: usa el SDK oficial (llamada
 * HTTP a /mail/send), no SMTP.
 */
@Service
@Slf4j
public class SendGridMailService implements MailService {

    @Override
    public void sendHtml(MailConfig config, String toEmail, String subject, String htmlBody) {
        try {
            Email from = new Email(config.fromEmail(), config.fromName());
            Content content = new Content("text/html", htmlBody);

            Mail mail = new Mail();
            mail.setFrom(from);
            mail.setSubject(subject);
            mail.addContent(content);

            Personalization personalization = new Personalization();
            personalization.addTo(new Email(toEmail));
            mail.addPersonalization(personalization);

            SendGrid sg = new SendGrid(config.sendgridApiKey());
            Request request = new Request();
            request.setMethod(Method.POST);
            request.setEndpoint("mail/send");
            request.setBody(mail.build());

            Response response = sg.api(request);

            if (response.getStatusCode() >= 400) {
                log.error("SendGrid error: status={}, body={}", response.getStatusCode(), response.getBody());
                throw new RuntimeException("SendGrid rechazo el envio: " + response.getStatusCode());
            }
            log.info("Email (SendGrid) enviado a {} -- status {}", toEmail, response.getStatusCode());
        } catch (Exception e) {
            log.error("Error enviando email por SendGrid a {}: {}", toEmail, e.getMessage());
            throw new RuntimeException("No se pudo enviar el correo por SendGrid: " + e.getMessage(), e);
        }
    }
}
