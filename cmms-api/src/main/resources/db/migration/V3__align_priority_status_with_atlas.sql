-- Alinea los valores existentes con el modelo real de Atlas CMMS
-- (priority: None/Low/Medium/High -- status: Open/In Progress/On Hold/Complete)
UPDATE work_orders SET priority = 'HIGH' WHERE priority = 'CRITICAL';
UPDATE work_orders SET status = 'COMPLETED' WHERE status = 'CANCELLED';

ALTER TABLE work_orders ALTER COLUMN priority SET DEFAULT 'NONE';
