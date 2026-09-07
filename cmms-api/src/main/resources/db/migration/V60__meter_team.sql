-- Equipo responsable del medidor.
--
-- Determina quien lo ve en el listado: los integrantes del equipo, mas
-- quien tenga permiso de "ver de otros" (jefe de mantenimiento y
-- administradores).
--
-- Un medidor pertenece a UN solo equipo. Los medidores existentes quedan
-- sin equipo, y en ese caso los ve todo el mundo -- hay que asignarlos.
ALTER TABLE meters ADD COLUMN IF NOT EXISTS team_id BIGINT REFERENCES teams(id);

CREATE INDEX IF NOT EXISTS idx_meters_team ON meters (team_id);
