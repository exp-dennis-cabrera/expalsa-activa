ALTER TABLE meter_triggers ADD COLUMN category_id BIGINT REFERENCES categories(id);
ALTER TABLE meter_triggers ADD COLUMN location_id BIGINT REFERENCES locations(id);
ALTER TABLE meter_triggers ADD COLUMN asset_id BIGINT REFERENCES assets(id);
ALTER TABLE meter_triggers ADD COLUMN team_id BIGINT REFERENCES teams(id);
ALTER TABLE meter_triggers ADD COLUMN due_date TIMESTAMP;
ALTER TABLE meter_triggers ADD COLUMN estimated_start_date TIMESTAMP;
ALTER TABLE meter_triggers ADD COLUMN estimated_duration_minutes INTEGER;
