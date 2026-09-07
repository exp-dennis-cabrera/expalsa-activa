-- Catalogo de categorias (reemplaza el texto libre)
CREATE TABLE categories (
    id BIGSERIAL PRIMARY KEY,
    organization_id BIGINT NOT NULL REFERENCES organizations(id),
    name VARCHAR(150) NOT NULL,
    type VARCHAR(30) NOT NULL DEFAULT 'WORK_ORDER',
    created_at TIMESTAMP NOT NULL DEFAULT now(),
    updated_at TIMESTAMP NOT NULL DEFAULT now()
);
CREATE INDEX idx_categories_org_type ON categories(organization_id, type);

-- work_orders: quitamos el texto libre de categoria, agregamos la FK al catalogo
ALTER TABLE work_orders DROP COLUMN category;
ALTER TABLE work_orders ADD COLUMN category_id BIGINT REFERENCES categories(id);

-- Fechas con hora (antes solo DATE, ahora TIMESTAMP)
ALTER TABLE work_orders ALTER COLUMN due_date TYPE TIMESTAMP USING due_date::timestamp;
ALTER TABLE work_orders ALTER COLUMN estimated_start_date TYPE TIMESTAMP USING estimated_start_date::timestamp;

-- Firma requerida
ALTER TABLE work_orders ADD COLUMN requires_signature BOOLEAN NOT NULL DEFAULT false;

-- Trabajador principal, separado de "assignees" (que ahora son los adicionales)
ALTER TABLE work_orders ADD COLUMN primary_assignee_id BIGINT REFERENCES users(id);
