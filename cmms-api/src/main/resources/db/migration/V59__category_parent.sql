-- Categoria padre: permite agrupar variantes bajo un concepto comun.
--
-- Caso que lo motiva: "Agua dulce" y "Agua clarificada" son categorias
-- distintas de medidor, pero ambas son AGUA. Sin un nivel superior, la
-- pantalla de medidores muestra una pestaña por cada variante y se
-- vuelve inmanejable al agregar mas.
--
-- Solo DOS niveles: una categoria con padre no puede tener hijas.
ALTER TABLE categories ADD COLUMN IF NOT EXISTS parent_id BIGINT REFERENCES categories(id);

CREATE INDEX IF NOT EXISTS idx_categories_parent ON categories (parent_id);
