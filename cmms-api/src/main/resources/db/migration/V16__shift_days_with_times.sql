ALTER TABLE shift_days DROP COLUMN availability_minutes;
ALTER TABLE shift_days ADD COLUMN start_time TIME;
ALTER TABLE shift_days ADD COLUMN end_time TIME;
