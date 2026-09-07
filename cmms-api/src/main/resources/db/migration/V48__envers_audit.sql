-- Auditoria automatica de cambios con Hibernate Envers, igual que el
-- original. A partir de aqui, CADA modificacion de una orden de trabajo
-- queda registrada automaticamente por Hibernate -- sin escribir codigo
-- de registro en cada punto donde se edita.
--
-- revinfo: una fila por cada "revision" (un guardado), con quien y cuando.
CREATE TABLE revinfo (
    rev SERIAL PRIMARY KEY,
    revtstmp BIGINT,
    user_id BIGINT REFERENCES users(id)
);

-- work_orders_aud: una fila por cada version de cada orden de trabajo.
-- Las columnas "*_mod" son las banderas de campo modificado que genera
-- Envers con withModifiedFlag = true: dicen exactamente QUE campo cambio
-- en esa revision, que es lo que permite armar el resumen legible.
CREATE TABLE work_orders_aud (
    id BIGINT NOT NULL,
    rev INTEGER NOT NULL REFERENCES revinfo(rev),
    revtype SMALLINT,

    organization_id BIGINT,
    title VARCHAR(255),
    title_mod BOOLEAN,
    custom_id VARCHAR(255),
    custom_id_mod BOOLEAN,
    description TEXT,
    description_mod BOOLEAN,
    status VARCHAR(50),
    status_mod BOOLEAN,
    priority VARCHAR(50),
    priority_mod BOOLEAN,
    type VARCHAR(50),
    type_mod BOOLEAN,
    category_id BIGINT,
    category_mod BOOLEAN,
    asset_id BIGINT,
    asset_mod BOOLEAN,
    location_id BIGINT,
    location_mod BOOLEAN,
    created_by_id BIGINT,
    created_by_mod BOOLEAN,
    completed_by_id BIGINT,
    completed_by_mod BOOLEAN,
    primary_assignee_id BIGINT,
    primary_assignee_mod BOOLEAN,
    vendor_id BIGINT,
    vendor_mod BOOLEAN,
    team_id BIGINT,
    team_mod BOOLEAN,
    parent_preventive_maintenance_id BIGINT,
    parent_preventive_maintenance_mod BOOLEAN,
    parent_request_id BIGINT,
    parent_request_mod BOOLEAN,
    first_reacted_at TIMESTAMP,
    first_reacted_at_mod BOOLEAN,
    due_date TIMESTAMP,
    due_date_mod BOOLEAN,
    estimated_start_date TIMESTAMP,
    estimated_start_date_mod BOOLEAN,
    requires_signature BOOLEAN,
    requires_signature_mod BOOLEAN,
    feedback TEXT,
    feedback_mod BOOLEAN,
    signature TEXT,
    signature_mod BOOLEAN,
    completed_at TIMESTAMP,
    completed_at_mod BOOLEAN,
    estimated_duration_minutes INTEGER,
    estimated_duration_minutes_mod BOOLEAN,
    actual_duration_minutes INTEGER,
    actual_duration_minutes_mod BOOLEAN,
    archived BOOLEAN,
    archived_mod BOOLEAN,
    created_at TIMESTAMP,
    updated_at TIMESTAMP,

    PRIMARY KEY (id, rev)
);

CREATE INDEX idx_work_orders_aud_id ON work_orders_aud (id);
