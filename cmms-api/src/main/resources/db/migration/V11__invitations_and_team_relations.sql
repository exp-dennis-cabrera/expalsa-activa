CREATE TABLE user_invitations (
    id BIGSERIAL PRIMARY KEY,
    organization_id BIGINT NOT NULL REFERENCES organizations(id),
    email VARCHAR(255) NOT NULL,
    role_id BIGINT NOT NULL REFERENCES roles(id),
    created_at TIMESTAMP NOT NULL DEFAULT now(),
    updated_at TIMESTAMP NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX idx_user_invitations_email ON user_invitations(email);

CREATE TABLE team_assets (
    team_id BIGINT NOT NULL REFERENCES teams(id),
    asset_id BIGINT NOT NULL REFERENCES assets(id),
    PRIMARY KEY (team_id, asset_id)
);

CREATE TABLE team_locations (
    team_id BIGINT NOT NULL REFERENCES teams(id),
    location_id BIGINT NOT NULL REFERENCES locations(id),
    PRIMARY KEY (team_id, location_id)
);
