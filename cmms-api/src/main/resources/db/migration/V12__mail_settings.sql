CREATE TABLE mail_settings (
    id BIGSERIAL PRIMARY KEY,
    organization_id BIGINT NOT NULL REFERENCES organizations(id),
    enabled BOOLEAN NOT NULL DEFAULT false,
    mail_type VARCHAR(20) NOT NULL DEFAULT 'SMTP',
    from_email VARCHAR(255),
    from_name VARCHAR(150),
    sendgrid_api_key VARCHAR(255),
    smtp_host VARCHAR(255),
    smtp_port INTEGER,
    smtp_username VARCHAR(255),
    smtp_password VARCHAR(255),
    created_at TIMESTAMP NOT NULL DEFAULT now(),
    updated_at TIMESTAMP NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX idx_mail_settings_org ON mail_settings(organization_id);
