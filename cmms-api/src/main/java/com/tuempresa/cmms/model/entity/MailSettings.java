package com.tuempresa.cmms.model.entity;

import com.tuempresa.cmms.tenant.BaseTenantEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.Setter;

/**
 * Configuracion de correo por organizacion, editable desde Ajustes sin
 * reiniciar el servidor. Si una organizacion no tiene registro aqui, se
 * usan los valores por defecto de application.yml (variables de entorno).
 */
@Entity
@Table(name = "mail_settings")
@Getter
@Setter
public class MailSettings extends BaseTenantEntity {

    private Boolean enabled = false;

    @Column(nullable = false)
    private String mailType = "SMTP"; // SMTP | SENDGRID

    private String fromEmail;
    private String fromName;

    private String sendgridApiKey;

    private String smtpHost;
    private Integer smtpPort;
    private String smtpUsername;
    private String smtpPassword;

    // Para servidores SMTP internos con certificados autofirmados (comun en
    // redes corporativas). Desactiva la validacion estricta de la cadena de
    // certificacion -- solo recomendable para servidores dentro de tu propia red.
    private Boolean smtpTrustAllCertificates = false;
}
