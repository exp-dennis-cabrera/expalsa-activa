CREATE TABLE material_requests (
    id BIGSERIAL PRIMARY KEY,
    organization_id BIGINT NOT NULL REFERENCES organizations(id),
    work_order_id BIGINT NOT NULL REFERENCES work_orders(id) ON DELETE CASCADE,
    requested_by_id BIGINT REFERENCES users(id),
    status VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    notes TEXT,
    erp_request_id VARCHAR(100),
    rejection_reason TEXT,
    decided_by_erp VARCHAR(255),
    decided_at TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT now(),
    updated_at TIMESTAMP NOT NULL DEFAULT now()
);

CREATE TABLE material_request_items (
    id BIGSERIAL PRIMARY KEY,
    organization_id BIGINT NOT NULL REFERENCES organizations(id),
    material_request_id BIGINT NOT NULL REFERENCES material_requests(id) ON DELETE CASCADE,
    part_id BIGINT NOT NULL REFERENCES parts(id),
    requested_quantity INTEGER NOT NULL,
    approved_quantity INTEGER,
    created_at TIMESTAMP NOT NULL DEFAULT now(),
    updated_at TIMESTAMP NOT NULL DEFAULT now()
);

CREATE INDEX idx_material_requests_wo ON material_requests(work_order_id);
