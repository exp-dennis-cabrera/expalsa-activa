-- Deprecacion (depreciacion)
CREATE TABLE deprecations (
    id BIGSERIAL PRIMARY KEY,
    organization_id BIGINT NOT NULL REFERENCES organizations(id),
    purchase_price DOUBLE PRECISION,
    purchase_date DATE,
    residual_value DOUBLE PRECISION,
    useful_life VARCHAR(100),
    rate INTEGER,
    current_value DOUBLE PRECISION,
    created_at TIMESTAMP NOT NULL DEFAULT now(),
    updated_at TIMESTAMP NOT NULL DEFAULT now()
);

-- Ampliar assets con todos los campos nuevos
ALTER TABLE assets ADD COLUMN custom_id VARCHAR(20);
ALTER TABLE assets ADD COLUMN power VARCHAR(100);
ALTER TABLE assets ADD COLUMN area VARCHAR(255);
ALTER TABLE assets ADD COLUMN bar_code VARCHAR(255);
ALTER TABLE assets ADD COLUMN nfc_id VARCHAR(255);
ALTER TABLE assets ADD COLUMN warranty_expiration_date DATE;
ALTER TABLE assets ADD COLUMN in_service_date DATE;
ALTER TABLE assets ADD COLUMN additional_infos TEXT;
ALTER TABLE assets ADD COLUMN primary_user_id BIGINT REFERENCES users(id);
ALTER TABLE assets ADD COLUMN deprecation_id BIGINT REFERENCES deprecations(id);
ALTER TABLE assets ADD COLUMN category_id BIGINT REFERENCES categories(id);

-- Migrar el status de texto libre a un valor valido del enum (default a OPERATIONAL si no matchea)
ALTER TABLE assets ADD COLUMN status_new VARCHAR(30) NOT NULL DEFAULT 'OPERATIONAL';
UPDATE assets SET status_new = status WHERE status IN
    ('OPERATIONAL','DOWN','MODERNIZATION','STANDBY','INSPECTION_SCHEDULED','COMMISSIONING','EMERGENCY_SHUTDOWN');
ALTER TABLE assets DROP COLUMN status;
ALTER TABLE assets RENAME COLUMN status_new TO status;

-- La columna category de texto libre se reemplaza por category_id (relacion)
ALTER TABLE assets DROP COLUMN category;

-- Relaciones many-to-many
CREATE TABLE asset_assigned_users (
    asset_id BIGINT NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    PRIMARY KEY (asset_id, user_id)
);

CREATE TABLE asset_teams (
    asset_id BIGINT NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
    team_id BIGINT NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
    PRIMARY KEY (asset_id, team_id)
);

CREATE TABLE asset_vendors (
    asset_id BIGINT NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
    vendor_id BIGINT NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,
    PRIMARY KEY (asset_id, vendor_id)
);

CREATE TABLE asset_parts (
    asset_id BIGINT NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
    part_id BIGINT NOT NULL REFERENCES parts(id) ON DELETE CASCADE,
    PRIMARY KEY (asset_id, part_id)
);

-- Medidores
CREATE TABLE meters (
    id BIGSERIAL PRIMARY KEY,
    organization_id BIGINT NOT NULL REFERENCES organizations(id),
    name VARCHAR(255) NOT NULL,
    unit VARCHAR(50),
    update_frequency_days INTEGER NOT NULL DEFAULT 30,
    asset_id BIGINT NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
    created_at TIMESTAMP NOT NULL DEFAULT now(),
    updated_at TIMESTAMP NOT NULL DEFAULT now()
);

CREATE TABLE meter_readings (
    id BIGSERIAL PRIMARY KEY,
    organization_id BIGINT NOT NULL REFERENCES organizations(id),
    meter_id BIGINT NOT NULL REFERENCES meters(id) ON DELETE CASCADE,
    value DOUBLE PRECISION NOT NULL,
    created_by_id BIGINT REFERENCES users(id),
    reading_date TIMESTAMP NOT NULL DEFAULT now(),
    created_at TIMESTAMP NOT NULL DEFAULT now(),
    updated_at TIMESTAMP NOT NULL DEFAULT now()
);

-- Tiempos de inactividad
CREATE TABLE asset_downtimes (
    id BIGSERIAL PRIMARY KEY,
    organization_id BIGINT NOT NULL REFERENCES organizations(id),
    asset_id BIGINT NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
    starts_on TIMESTAMP NOT NULL,
    duration_seconds BIGINT,
    created_at TIMESTAMP NOT NULL DEFAULT now(),
    updated_at TIMESTAMP NOT NULL DEFAULT now()
);

ALTER TABLE files ADD COLUMN asset_id BIGINT REFERENCES assets(id) ON DELETE CASCADE;
