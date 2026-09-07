-- Igual que el modelo Notification real: el ID del recurso relacionado es
-- GENERICO (resource_id + notification_type), no especifico de ordenes de
-- trabajo. Antes solo se podia enlazar a una orden de trabajo, asi que las
-- notificaciones de activos, medidores, ubicaciones, equipos y solicitudes
-- no llevaban a ningun lado al hacer clic.

ALTER TABLE notifications RENAME COLUMN work_order_id TO resource_id;
ALTER TABLE notifications RENAME COLUMN type TO notification_type;

-- Los tipos que teniamos eran granulares ("que paso"); el real usa el
-- MODULO del recurso ("a donde navegar"). El detalle de que paso ya vive
-- en el titulo de cada notificacion, asi que no se pierde informacion.
UPDATE notifications SET notification_type = 'WORK_ORDER'
    WHERE notification_type IN ('WORK_ORDER_ASSIGNED', 'WORK_ORDER_COMMENT', 'WORK_ORDER_STATUS_CHANGED');
UPDATE notifications SET notification_type = 'REQUEST'
    WHERE notification_type IN ('NEW_REQUEST', 'REQUEST_APPROVED', 'REQUEST_CANCELLED');
UPDATE notifications SET notification_type = 'PART'
    WHERE notification_type = 'MATERIAL_REQUEST';

-- Cualquier valor que no sea uno de los 9 tipos reales pasa a INFO.
UPDATE notifications SET notification_type = 'INFO'
    WHERE notification_type NOT IN ('INFO', 'ASSET', 'WORK_ORDER', 'PART', 'METER',
                                    'LOCATION', 'TEAM', 'REQUEST', 'PURCHASE_ORDER');
