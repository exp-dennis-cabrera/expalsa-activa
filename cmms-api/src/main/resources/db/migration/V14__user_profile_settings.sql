ALTER TABLE users ADD COLUMN avatar_storage_key VARCHAR(500);

CREATE TABLE user_settings (
    id BIGSERIAL PRIMARY KEY,
    organization_id BIGINT NOT NULL REFERENCES organizations(id),
    user_id BIGINT NOT NULL REFERENCES users(id),
    email_notified BOOLEAN NOT NULL DEFAULT true,
    email_updates_for_work_orders BOOLEAN NOT NULL DEFAULT true,
    email_updates_for_requests BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP NOT NULL DEFAULT now(),
    updated_at TIMESTAMP NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX idx_user_settings_user ON user_settings(user_id);
