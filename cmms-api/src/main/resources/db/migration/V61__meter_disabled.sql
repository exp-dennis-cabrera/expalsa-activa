-- Medidor deshabilitado: se oculta del listado sin borrarlo.
--
-- Distinto de eliminar: las lecturas historicas se conservan y se puede
-- volver a habilitar. Sirve para equipos retirados de servicio o lineas
-- paradas por temporada.
--
-- Los medidores existentes quedan habilitados.
ALTER TABLE meters ADD COLUMN IF NOT EXISTS disabled BOOLEAN NOT NULL DEFAULT FALSE;

CREATE INDEX IF NOT EXISTS idx_meters_disabled ON meters (disabled);
