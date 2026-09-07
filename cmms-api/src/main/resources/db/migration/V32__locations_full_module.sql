ALTER TABLE locations ADD COLUMN custom_id VARCHAR(20);
ALTER TABLE locations ADD COLUMN image_url TEXT;

CREATE TABLE location_vendors (
    location_id BIGINT NOT NULL REFERENCES locations(id) ON DELETE CASCADE,
    vendor_id BIGINT NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,
    PRIMARY KEY (location_id, vendor_id)
);

CREATE TABLE floor_plans (
    id BIGSERIAL PRIMARY KEY,
    organization_id BIGINT NOT NULL REFERENCES organizations(id),
    name VARCHAR(255) NOT NULL,
    area DOUBLE PRECISION,
    image_url TEXT,
    location_id BIGINT NOT NULL REFERENCES locations(id) ON DELETE CASCADE,
    created_at TIMESTAMP NOT NULL DEFAULT now(),
    updated_at TIMESTAMP NOT NULL DEFAULT now()
);

ALTER TABLE files ADD COLUMN location_id BIGINT REFERENCES locations(id) ON DELETE CASCADE;

-- work_orders.location_id ya existe (se usaba en filtros/creacion); no se toca.
