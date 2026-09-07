ALTER TABLE meters ADD COLUMN location_id BIGINT REFERENCES locations(id);
ALTER TABLE files ADD COLUMN meter_id BIGINT REFERENCES meters(id);
