ALTER TABLE preventive_maintenances ADD COLUMN title VARCHAR(255);
UPDATE preventive_maintenances SET title = name WHERE title IS NULL;
ALTER TABLE preventive_maintenances ALTER COLUMN title SET NOT NULL;

ALTER TABLE preventive_maintenances ADD COLUMN days_before_notification INTEGER NOT NULL DEFAULT 3;
ALTER TABLE preventive_maintenances ADD COLUMN last_notified_at TIMESTAMP;
