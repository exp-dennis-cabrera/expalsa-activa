package com.tuempresa.cmms.service.mail;

public interface MailService {
    void sendHtml(MailConfig config, String toEmail, String subject, String htmlBody);
}
