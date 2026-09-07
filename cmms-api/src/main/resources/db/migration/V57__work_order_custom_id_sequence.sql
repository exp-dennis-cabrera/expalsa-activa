-- Secuencia para el identificador visible de las ordenes (WO000001).
--
-- Antes se calculaba con count() + 1, que tiene dos fallas:
--   1. Dos personas creando a la vez obtienen el MISMO numero.
--   2. Si se borra una orden intermedia, el contador reutiliza un codigo
--      que ya existio.
--
-- Una secuencia de PostgreSQL no repite ni se ve afectada por borrados.
CREATE SEQUENCE IF NOT EXISTS work_order_custom_id_seq START WITH 1;

-- Arranca despues del maximo actual, para no chocar con lo ya creado.
SELECT setval('work_order_custom_id_seq',
              GREATEST((SELECT COUNT(*) FROM work_orders), 1));

-- Ademas, el codigo no puede repetirse.
CREATE UNIQUE INDEX IF NOT EXISTS uq_work_orders_custom_id
    ON work_orders (organization_id, custom_id)
    WHERE custom_id IS NOT NULL;
