package com.tuempresa.cmms.model.enums;

/**
 * Igual que el MailType.java real de Atlas: permite elegir el proveedor
 * de correo por configuracion, sin tocar codigo (ver MailServiceFactory).
 */
public enum MailType {
    SMTP,
    SENDGRID
}
