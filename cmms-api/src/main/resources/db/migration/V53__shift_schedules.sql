-- Horarios de los dos turnos de la planta (diurno y nocturno).
--
-- Viven a nivel de organizacion para poder ajustarlos desde Ajustes sin
-- editar el turno de cada persona. Al configurar el turno de alguien, estos
-- horarios se ofrecen como plantilla.
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS day_shift_start TIME NOT NULL DEFAULT '07:00';
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS day_shift_end TIME NOT NULL DEFAULT '19:00';
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS night_shift_start TIME NOT NULL DEFAULT '19:00';
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS night_shift_end TIME NOT NULL DEFAULT '07:00';
