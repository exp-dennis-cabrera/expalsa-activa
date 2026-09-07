CREATE TABLE files (
    id BIGSERIAL PRIMARY KEY,
    organization_id BIGINT NOT NULL REFERENCES organizations(id),
    work_order_id BIGINT REFERENCES work_orders(id),
    file_name VARCHAR(500) NOT NULL,
    storage_key VARCHAR(500) NOT NULL,
    content_type VARCHAR(150),
    size_bytes BIGINT,
    uploaded_by_id BIGINT REFERENCES users(id),
    created_at TIMESTAMP NOT NULL DEFAULT now(),
    updated_at TIMESTAMP NOT NULL DEFAULT now()
);

CREATE INDEX idx_files_wo ON files(work_order_id);
