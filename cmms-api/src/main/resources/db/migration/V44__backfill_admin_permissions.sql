-- Los roles ADMIN creados ANTES de que existiera el motor de permisos
-- granular (por ejemplo, al registrar una organizacion nueva antes de esta
-- migracion) quedaron con los 5 conjuntos de permisos vacios. Este script
-- les da todos los permisos, igual que corresponde a un rol ADMIN real.

DO $$
DECLARE
    role_row RECORD;
    permission_value TEXT;
    all_permissions TEXT[] := ARRAY[
        'PEOPLE_AND_TEAMS', 'CATEGORIES', 'CATEGORIES_WEB', 'WORK_ORDERS',
        'PREVENTIVE_MAINTENANCES', 'ASSETS', 'PARTS_AND_MULTIPARTS',
        'PURCHASE_ORDERS', 'METERS', 'VENDORS_AND_CUSTOMERS', 'FILES',
        'LOCATIONS', 'SETTINGS', 'REQUESTS', 'ANALYTICS'
    ];
BEGIN
    FOR role_row IN SELECT id FROM roles WHERE name = 'ADMIN' LOOP
        FOREACH permission_value IN ARRAY all_permissions LOOP
            IF NOT EXISTS (SELECT 1 FROM role_create_permissions WHERE role_id = role_row.id AND permission = permission_value) THEN
                INSERT INTO role_create_permissions (role_id, permission) VALUES (role_row.id, permission_value);
            END IF;
            IF NOT EXISTS (SELECT 1 FROM role_view_permissions WHERE role_id = role_row.id AND permission = permission_value) THEN
                INSERT INTO role_view_permissions (role_id, permission) VALUES (role_row.id, permission_value);
            END IF;
            IF NOT EXISTS (SELECT 1 FROM role_view_other_permissions WHERE role_id = role_row.id AND permission = permission_value) THEN
                INSERT INTO role_view_other_permissions (role_id, permission) VALUES (role_row.id, permission_value);
            END IF;
            IF NOT EXISTS (SELECT 1 FROM role_edit_other_permissions WHERE role_id = role_row.id AND permission = permission_value) THEN
                INSERT INTO role_edit_other_permissions (role_id, permission) VALUES (role_row.id, permission_value);
            END IF;
            IF NOT EXISTS (SELECT 1 FROM role_delete_other_permissions WHERE role_id = role_row.id AND permission = permission_value) THEN
                INSERT INTO role_delete_other_permissions (role_id, permission) VALUES (role_row.id, permission_value);
            END IF;
        END LOOP;
        UPDATE roles SET code = 'ADMIN' WHERE id = role_row.id AND code IS NULL;
    END LOOP;
END $$;
