CREATE TABLE shift_days (
    id BIGSERIAL PRIMARY KEY,
    organization_id BIGINT NOT NULL REFERENCES organizations(id),
    user_id BIGINT NOT NULL REFERENCES users(id),
    day_of_week VARCHAR(10) NOT NULL,
    enabled BOOLEAN NOT NULL DEFAULT false,
    availability_minutes INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP NOT NULL DEFAULT now(),
    updated_at TIMESTAMP NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX idx_shift_days_user_day ON shift_days(user_id, day_of_week);
