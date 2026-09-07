ALTER TABLE work_order_time_logs ALTER COLUMN hours DROP NOT NULL;
ALTER TABLE work_order_time_logs ADD COLUMN status VARCHAR(20) NOT NULL DEFAULT 'STOPPED';
ALTER TABLE work_order_time_logs ADD COLUMN started_at TIMESTAMP;

CREATE TABLE vendors (
    id BIGSERIAL PRIMARY KEY,
    organization_id BIGINT NOT NULL REFERENCES organizations(id),
    company_name VARCHAR(255) NOT NULL,
    vendor_type VARCHAR(50),
    rate DOUBLE PRECISION,
    created_at TIMESTAMP NOT NULL DEFAULT now(),
    updated_at TIMESTAMP NOT NULL DEFAULT now()
);

ALTER TABLE work_orders ADD COLUMN vendor_id BIGINT REFERENCES vendors(id);
