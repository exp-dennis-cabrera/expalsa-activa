CREATE TABLE requests (
    id BIGSERIAL PRIMARY KEY,
    organization_id BIGINT NOT NULL REFERENCES organizations(id),
    custom_id VARCHAR(20),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    priority VARCHAR(20) NOT NULL DEFAULT 'NONE',
    type VARCHAR(20),
    category_id BIGINT REFERENCES categories(id),
    asset_id BIGINT REFERENCES assets(id),
    location_id BIGINT REFERENCES locations(id),
    team_id BIGINT REFERENCES teams(id),
    due_date TIMESTAMP,
    estimated_duration_minutes INTEGER,
    created_by_id BIGINT REFERENCES users(id),
    contact VARCHAR(255),
    cancelled BOOLEAN NOT NULL DEFAULT false,
    cancellation_reason TEXT,
    work_order_id BIGINT REFERENCES work_orders(id),
    created_at TIMESTAMP NOT NULL DEFAULT now(),
    updated_at TIMESTAMP NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX idx_requests_work_order ON requests(work_order_id) WHERE work_order_id IS NOT NULL;
