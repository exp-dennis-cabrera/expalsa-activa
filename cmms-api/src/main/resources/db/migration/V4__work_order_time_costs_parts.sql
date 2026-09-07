ALTER TABLE users ADD COLUMN hourly_rate DOUBLE PRECISION;

CREATE TABLE work_order_time_logs (
    id BIGSERIAL PRIMARY KEY,
    organization_id BIGINT NOT NULL REFERENCES organizations(id),
    work_order_id BIGINT NOT NULL REFERENCES work_orders(id),
    user_id BIGINT NOT NULL REFERENCES users(id),
    hours DOUBLE PRECISION NOT NULL,
    log_date DATE,
    hourly_rate_snapshot DOUBLE PRECISION,
    created_at TIMESTAMP NOT NULL DEFAULT now(),
    updated_at TIMESTAMP NOT NULL DEFAULT now()
);

CREATE TABLE work_order_additional_costs (
    id BIGSERIAL PRIMARY KEY,
    organization_id BIGINT NOT NULL REFERENCES organizations(id),
    work_order_id BIGINT NOT NULL REFERENCES work_orders(id),
    description VARCHAR(255) NOT NULL,
    cost DOUBLE PRECISION NOT NULL,
    category VARCHAR(150),
    created_by_id BIGINT REFERENCES users(id),
    created_at TIMESTAMP NOT NULL DEFAULT now(),
    updated_at TIMESTAMP NOT NULL DEFAULT now()
);

ALTER TABLE work_order_parts ADD COLUMN unit_cost_snapshot DOUBLE PRECISION;

CREATE INDEX idx_wo_time_logs_wo ON work_order_time_logs(work_order_id);
CREATE INDEX idx_wo_costs_wo ON work_order_additional_costs(work_order_id);
CREATE INDEX idx_wo_parts_wo ON work_order_parts(work_order_id);
