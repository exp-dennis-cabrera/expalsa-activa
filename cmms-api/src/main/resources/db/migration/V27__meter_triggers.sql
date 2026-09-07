CREATE TABLE meter_triggers (
    id BIGSERIAL PRIMARY KEY,
    organization_id BIGINT NOT NULL REFERENCES organizations(id),
    meter_id BIGINT NOT NULL REFERENCES meters(id) ON DELETE CASCADE,
    condition VARCHAR(20) NOT NULL,
    value DOUBLE PRECISION NOT NULL,
    work_order_title VARCHAR(255) NOT NULL,
    work_order_description TEXT,
    priority VARCHAR(20) NOT NULL DEFAULT 'MEDIUM',
    primary_assignee_id BIGINT REFERENCES users(id),
    created_at TIMESTAMP NOT NULL DEFAULT now(),
    updated_at TIMESTAMP NOT NULL DEFAULT now()
);

-- Usuarios asignados a un medidor, para saber a quien avisar cuando una
-- lectura cruza un umbral (igual que Meter.users real de Atlas).
CREATE TABLE meter_assigned_users (
    meter_id BIGINT NOT NULL REFERENCES meters(id) ON DELETE CASCADE,
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    PRIMARY KEY (meter_id, user_id)
);
