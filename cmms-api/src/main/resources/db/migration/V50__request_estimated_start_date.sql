-- Igual que WorkOrderBase.estimatedStartDate real: las solicitudes tambien
-- pueden indicar cuando se preve empezar el trabajo, no solo cuando vence.
ALTER TABLE requests ADD COLUMN IF NOT EXISTS estimated_start_date TIMESTAMP;
