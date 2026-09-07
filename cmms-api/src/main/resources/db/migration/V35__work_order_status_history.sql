CREATE TABLE work_order_status_history (
    id BIGSERIAL PRIMARY KEY,
    organization_id BIGINT NOT NULL REFERENCES organizations(id),
    work_order_id BIGINT NOT NULL REFERENCES work_orders(id) ON DELETE CASCADE,
    status VARCHAR(20) NOT NULL,
    changed_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT now(),
    updated_at TIMESTAMP NOT NULL DEFAULT now()
);
CREATE INDEX idx_wo_status_history_wo ON work_order_status_history(work_order_id, changed_at);

-- Ordenes que ya existian antes de esta migracion no tienen historial --
-- se les crea un registro inicial con su estado actual, fechado en su
-- creacion, para que al menos tengan un punto de partida razonable.
INSERT INTO work_order_status_history (organization_id, work_order_id, status, changed_at)
SELECT organization_id, id, status, created_at FROM work_orders;
