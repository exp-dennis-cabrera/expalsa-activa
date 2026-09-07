-- Equipos fisicos de un medidor.
--
-- Un medidor logico ("Consumo Sala de Maquinas") puede pasar por varios
-- contadores fisicos: cuando uno se daña se reemplaza, y el nuevo arranca
-- en cero. Sin esta tabla, ese cero rompe el consumo acumulado.
--
-- offset_value guarda cuanto acumularon los equipos anteriores, para que
-- la suma siga siendo continua:
--     acumulado real = offset_value + lectura fisica
CREATE TABLE meter_devices (
    id BIGSERIAL PRIMARY KEY,
    organization_id BIGINT NOT NULL REFERENCES organizations(id),
    meter_id BIGINT NOT NULL REFERENCES meters(id) ON DELETE CASCADE,
    serial_number VARCHAR(255),
    offset_value DOUBLE PRECISION NOT NULL DEFAULT 0,
    installed_at TIMESTAMP NOT NULL DEFAULT now(),
    removed_at TIMESTAMP,
    replaced_by_id BIGINT REFERENCES users(id),
    notes TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT now(),
    updated_at TIMESTAMP NOT NULL DEFAULT now()
);

CREATE INDEX idx_meter_devices_meter ON meter_devices (meter_id);
-- Un medidor solo puede tener UN equipo activo a la vez.
CREATE UNIQUE INDEX uq_meter_device_activo
    ON meter_devices (meter_id) WHERE removed_at IS NULL;

-- Que equipo dio cada lectura.
ALTER TABLE meter_readings ADD COLUMN IF NOT EXISTS device_id BIGINT REFERENCES meter_devices(id);
CREATE INDEX IF NOT EXISTS idx_meter_readings_device ON meter_readings (device_id);

-- Cada medidor existente arranca con un equipo inicial, sin arrastre.
-- Las lecturas ya registradas se le asignan.
INSERT INTO meter_devices (organization_id, meter_id, offset_value, installed_at, created_at, updated_at)
SELECT organization_id, id, 0, COALESCE(created_at, now()), now(), now()
FROM meters;

UPDATE meter_readings r
SET device_id = d.id
FROM meter_devices d
WHERE d.meter_id = r.meter_id AND r.device_id IS NULL;
