ALTER TABLE work_orders ADD COLUMN custom_id VARCHAR(20);

-- Backfill de las que ya existen, numeradas por fecha de creacion.
WITH numbered AS (
    SELECT id, ROW_NUMBER() OVER (PARTITION BY organization_id ORDER BY created_at) AS rn
    FROM work_orders
)
UPDATE work_orders w
SET custom_id = 'WO' || LPAD(numbered.rn::text, 6, '0')
FROM numbered
WHERE w.id = numbered.id;
