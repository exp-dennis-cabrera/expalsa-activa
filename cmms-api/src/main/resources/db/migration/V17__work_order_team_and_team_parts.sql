ALTER TABLE work_orders ADD COLUMN team_id BIGINT REFERENCES teams(id);

CREATE TABLE team_parts (
    team_id BIGINT NOT NULL REFERENCES teams(id),
    part_id BIGINT NOT NULL REFERENCES parts(id),
    PRIMARY KEY (team_id, part_id)
);
