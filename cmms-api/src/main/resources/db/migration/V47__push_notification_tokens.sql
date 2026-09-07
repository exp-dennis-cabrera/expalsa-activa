-- Igual que PushNotificationToken real: token del dispositivo movil de cada
-- usuario, para notificaciones push cuando la app no esta abierta.
CREATE TABLE push_notification_tokens (
    id BIGSERIAL PRIMARY KEY,
    organization_id BIGINT NOT NULL REFERENCES organizations(id),
    user_id BIGINT NOT NULL UNIQUE REFERENCES users(id),
    token VARCHAR(512) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT now(),
    updated_at TIMESTAMP NOT NULL DEFAULT now()
);
