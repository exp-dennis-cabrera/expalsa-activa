-- Hora limite para registrar las lecturas del dia (turno nocturno).
-- Antes de esta hora, un medidor sin leer esta PENDIENTE; despues, es
-- INCUMPLIDO. Por defecto 7 (07:00), que es cuando termina el turno.
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS reading_deadline_hour INTEGER NOT NULL DEFAULT 7;
