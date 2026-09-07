ALTER TABLE files ADD COLUMN comment_id BIGINT REFERENCES work_order_comments(id);
