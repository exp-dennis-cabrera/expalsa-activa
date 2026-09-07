package com.tuempresa.cmms.service.mail;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class MailServiceFactory {

    private final SmtpMailService smtpMailService;
    private final SendGridMailService sendGridMailService;

    public MailService getMailService(String mailType) {
        return "SENDGRID".equalsIgnoreCase(mailType) ? sendGridMailService : smtpMailService;
    }
}
