ALTER TABLE meters ADD COLUMN category_id BIGINT REFERENCES categories(id);
ALTER TABLE meters ADD COLUMN created_by_id BIGINT REFERENCES users(id);

ALTER TABLE meter_triggers ADD COLUMN name VARCHAR(255);
UPDATE meter_triggers SET name = work_order_title WHERE name IS NULL;
ALTER TABLE meter_triggers ALTER COLUMN name SET NOT NULL;
ALTER TABLE meter_triggers ADD COLUMN wait_before_days INTEGER NOT NULL DEFAULT 0;
ALTER TABLE meter_triggers ADD COLUMN last_triggered_at TIMESTAMP;
