-- Bug encontrado en la auditoria de notificaciones: asset_teams y
-- team_assets eran dos tablas de union separadas para el mismo vinculo
-- (Asset<->Team). team_assets ya existia y tiene UI funcional (TeamDialog),
-- asset_teams se agrego por error en el modulo de Activos y nunca tuvo UI
-- de escritura real -- se elimina.
DROP TABLE IF EXISTS asset_teams;
