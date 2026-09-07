-- Excepciones de turno: fechas puntuales que mandan sobre el turno semanal.
-- Vacaciones, feriados, capacitaciones o media jornada.
--
-- Sin esto, el planificador mostraba a alguien de vacaciones con capacidad
-- completa, y las barras de carga en verde aunque no estuviera disponible.
CREATE TABLE shift_exceptions (
    id BIGSERIAL PRIMARY KEY,
    organization_id BIGINT NOT NULL REFERENCES organizations(id),
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    exception_date DATE NOT NULL,
    availability_minutes INTEGER NOT NULL DEFAULT 0,
    enabled BOOLEAN NOT NULL DEFAULT false,
    reason VARCHAR(255),
    created_at TIMESTAMP NOT NULL DEFAULT now(),
    updated_at TIMESTAMP NOT NULL DEFAULT now(),
    CONSTRAINT uq_shift_exception_user_date UNIQUE (user_id, exception_date)
);

CREATE INDEX idx_shift_exceptions_user_date ON shift_exceptions (user_id, exception_date);
