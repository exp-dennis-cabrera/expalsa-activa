-- Estas dos relaciones ya existen en Part.java y Location.java (agregadas
-- en un intento anterior) pero su migracion habia quedado duplicada como
-- V26 junto con una copia vieja de meter_triggers (la version final de esa
-- tabla vive en V27). Se separan aqui, limpio.
CREATE TABLE part_assigned_users (
    part_id BIGINT NOT NULL REFERENCES parts(id) ON DELETE CASCADE,
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    PRIMARY KEY (part_id, user_id)
);

CREATE TABLE location_assigned_users (
    location_id BIGINT NOT NULL REFERENCES locations(id) ON DELETE CASCADE,
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    PRIMARY KEY (location_id, user_id)
);
