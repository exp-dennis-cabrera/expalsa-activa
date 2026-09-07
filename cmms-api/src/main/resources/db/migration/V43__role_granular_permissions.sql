-- Reemplaza el permissions_json de texto libre por el modelo real de 5
-- conjuntos de permisos tipados (createPermissions, viewPermissions,
-- viewOtherPermissions, editOtherPermissions, deleteOtherPermissions).

ALTER TABLE roles ADD COLUMN IF NOT EXISTS code VARCHAR(50);
ALTER TABLE roles ADD COLUMN IF NOT EXISTS description VARCHAR(255);
ALTER TABLE roles DROP COLUMN IF EXISTS permissions_json;

CREATE TABLE role_create_permissions (
    role_id BIGINT NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
    permission VARCHAR(40) NOT NULL
);

CREATE TABLE role_view_permissions (
    role_id BIGINT NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
    permission VARCHAR(40) NOT NULL
);

CREATE TABLE role_view_other_permissions (
    role_id BIGINT NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
    permission VARCHAR(40) NOT NULL
);

CREATE TABLE role_edit_other_permissions (
    role_id BIGINT NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
    permission VARCHAR(40) NOT NULL
);

CREATE TABLE role_delete_other_permissions (
    role_id BIGINT NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
    permission VARCHAR(40) NOT NULL
);

CREATE INDEX idx_role_create_permissions_role ON role_create_permissions (role_id);
CREATE INDEX idx_role_view_permissions_role ON role_view_permissions (role_id);
CREATE INDEX idx_role_view_other_permissions_role ON role_view_other_permissions (role_id);
CREATE INDEX idx_role_edit_other_permissions_role ON role_edit_other_permissions (role_id);
CREATE INDEX idx_role_delete_other_permissions_role ON role_delete_other_permissions (role_id);
