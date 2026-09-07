CREATE TABLE tasks (
    id BIGSERIAL PRIMARY KEY,
    organization_id BIGINT NOT NULL REFERENCES organizations(id),
    label VARCHAR(500) NOT NULL,
    type VARCHAR(20) NOT NULL DEFAULT 'TEXT',
    order_index INTEGER NOT NULL DEFAULT 0,
    work_order_id BIGINT REFERENCES work_orders(id) ON DELETE CASCADE,
    preventive_maintenance_id BIGINT REFERENCES preventive_maintenances(id) ON DELETE CASCADE,
    value TEXT,
    completed BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMP NOT NULL DEFAULT now(),
    updated_at TIMESTAMP NOT NULL DEFAULT now()
);
CREATE INDEX idx_tasks_work_order ON tasks(work_order_id);
CREATE INDEX idx_tasks_pm ON tasks(preventive_maintenance_id);
