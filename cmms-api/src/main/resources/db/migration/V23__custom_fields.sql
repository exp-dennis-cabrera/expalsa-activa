CREATE TABLE custom_fields (
    id BIGSERIAL PRIMARY KEY,
    organization_id BIGINT NOT NULL REFERENCES organizations(id),
    name VARCHAR(255) NOT NULL,
    type VARCHAR(20) NOT NULL DEFAULT 'TEXT',
    entity_type VARCHAR(30) NOT NULL,
    required BOOLEAN NOT NULL DEFAULT false,
    copy_on_generate BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP NOT NULL DEFAULT now(),
    updated_at TIMESTAMP NOT NULL DEFAULT now()
);

CREATE TABLE custom_field_options (
    custom_field_id BIGINT NOT NULL REFERENCES custom_fields(id) ON DELETE CASCADE,
    option_value VARCHAR(255) NOT NULL
);

CREATE TABLE custom_field_values (
    id BIGSERIAL PRIMARY KEY,
    organization_id BIGINT NOT NULL REFERENCES organizations(id),
    custom_field_id BIGINT NOT NULL REFERENCES custom_fields(id) ON DELETE CASCADE,
    work_order_id BIGINT REFERENCES work_orders(id) ON DELETE CASCADE,
    preventive_maintenance_id BIGINT REFERENCES preventive_maintenances(id) ON DELETE CASCADE,
    value TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT now(),
    updated_at TIMESTAMP NOT NULL DEFAULT now()
);
CREATE INDEX idx_cfv_work_order ON custom_field_values(work_order_id);
CREATE INDEX idx_cfv_pm ON custom_field_values(preventive_maintenance_id);
