-- Borrado en cascada de todo lo que cuelga de una orden de trabajo.
--
-- Antes, borrar una orden con tiempos, costos, repuestos, archivos o
-- comentarios fallaba con violacion de clave foranea: la orden vacia se
-- podia borrar, pero una usada normalmente no.
--
-- Se recrean las restricciones con ON DELETE CASCADE.
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN
        SELECT tc.table_name, tc.constraint_name
        FROM information_schema.table_constraints tc
        JOIN information_schema.key_column_usage kcu
          ON tc.constraint_name = kcu.constraint_name
        WHERE tc.constraint_type = 'FOREIGN KEY'
          AND kcu.column_name = 'work_order_id'
          AND tc.table_schema = 'public'
    LOOP
        EXECUTE format('ALTER TABLE %I DROP CONSTRAINT %I', r.table_name, r.constraint_name);
        EXECUTE format(
            'ALTER TABLE %I ADD CONSTRAINT %I FOREIGN KEY (work_order_id) '
            'REFERENCES work_orders(id) ON DELETE CASCADE',
            r.table_name, r.constraint_name);
    END LOOP;
END $$;
