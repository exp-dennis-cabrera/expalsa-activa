-- Igual que el real: se necesita saber quien creo un equipo, para que el
-- creador siempre pueda editarlo/eliminarlo aunque su rol no tenga los
-- permisos "de otros" sobre PEOPLE_AND_TEAMS.

ALTER TABLE teams ADD COLUMN IF NOT EXISTS created_by_id BIGINT REFERENCES users(id);
