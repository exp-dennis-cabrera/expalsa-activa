CREATE TABLE schedules (
    id BIGSERIAL PRIMARY KEY,
    organization_id BIGINT NOT NULL REFERENCES organizations(id),
    disabled BOOLEAN NOT NULL DEFAULT false,
    starts_on TIMESTAMP NOT NULL,
    frequency INTEGER NOT NULL DEFAULT 1,
    ends_on TIMESTAMP,
    due_date_delay INTEGER,
    recurrence_type VARCHAR(20) NOT NULL DEFAULT 'DAILY',
    recurrence_based_on VARCHAR(20) NOT NULL DEFAULT 'SCHEDULED_DATE',
    created_at TIMESTAMP NOT NULL DEFAULT now(),
    updated_at TIMESTAMP NOT NULL DEFAULT now()
);

CREATE TABLE schedule_days_of_week (
    schedule_id BIGINT NOT NULL REFERENCES schedules(id) ON DELETE CASCADE,
    day_of_week INTEGER NOT NULL
);

CREATE TABLE preventive_maintenances (
    id BIGSERIAL PRIMARY KEY,
    organization_id BIGINT NOT NULL REFERENCES organizations(id),
    custom_id VARCHAR(20),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    priority VARCHAR(20) NOT NULL DEFAULT 'NONE',
    category_id BIGINT REFERENCES categories(id),
    asset_id BIGINT REFERENCES assets(id),
    location_id BIGINT REFERENCES locations(id),
    team_id BIGINT REFERENCES teams(id),
    primary_assignee_id BIGINT REFERENCES users(id),
    estimated_duration_minutes INTEGER,
    schedule_id BIGINT REFERENCES schedules(id),
    last_generated_at TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT now(),
    updated_at TIMESTAMP NOT NULL DEFAULT now()
);

ALTER TABLE work_orders ADD COLUMN parent_preventive_maintenance_id BIGINT REFERENCES preventive_maintenances(id);
