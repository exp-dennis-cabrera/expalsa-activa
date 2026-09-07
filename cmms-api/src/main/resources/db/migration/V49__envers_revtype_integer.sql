-- La entidad WorkOrderAud declara revtype como Integer (igual que el real),
-- pero la migracion V48 lo creo como SMALLINT. Hibernate valida el tipo
-- exacto al arrancar, asi que hay que alinearlos.
-- La tabla esta vacia (Envers nunca llego a escribir), no hay riesgo de datos.
ALTER TABLE work_orders_aud ALTER COLUMN revtype TYPE INTEGER;
