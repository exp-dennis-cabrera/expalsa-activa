-- Llaves de acceso para sistemas externos (integracion con el ERP).
--
-- A diferencia del token de sesion, que dura 30 minutos, estas no caducan:
-- se revocan borrando la fila. El codigo se guarda cifrado con SHA-256,
-- nunca en texto plano -- si alguien lee la base, no puede usarlas.
CREATE TABLE api_keys (
    id BIGSERIAL PRIMARY KEY,
    organization_id BIGINT NOT NULL REFERENCES organizations(id),
    label VARCHAR(255) NOT NULL,
    code VARCHAR(255) NOT NULL UNIQUE,
    user_id BIGINT NOT NULL REFERENCES users(id),
    last_used TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT now(),
    updated_at TIMESTAMP NOT NULL DEFAULT now()
);

CREATE INDEX idx_api_keys_code ON api_keys (code);
