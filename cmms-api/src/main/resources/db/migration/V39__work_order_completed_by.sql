ALTER TABLE work_orders ADD COLUMN completed_by_id BIGINT REFERENCES users(id);
