-- Quien cambio el estado de la orden.
--
-- Hace falta para mostrar los cambios de estado como comentarios
-- automaticos en la pestaña Comentarios, igual que en Atlas CMMS: alli el
-- historial se convierte en comentarios de sistema con su autor.
ALTER TABLE work_order_status_history ADD COLUMN IF NOT EXISTS changed_by_id BIGINT REFERENCES users(id);
