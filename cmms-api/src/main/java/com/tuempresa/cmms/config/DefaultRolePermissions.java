package com.tuempresa.cmms.config;

import com.tuempresa.cmms.model.entity.Role;
import com.tuempresa.cmms.model.enums.PermissionEntity;
import com.tuempresa.cmms.model.enums.RoleCode;

import java.util.Arrays;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

/**
 * Copia fiel de Helper.getDefaultRoles() real: los 5 conjuntos de permisos
 * exactos para cada uno de los 6 roles predefinidos. Se usa tanto al
 * registrar una organizacion nueva (AuthService.register) como al sembrar
 * datos de desarrollo (DevDataSeeder), para que ambos caminos generen los
 * mismos 6 roles con los mismos permisos.
 */
public final class DefaultRolePermissions {

    private DefaultRolePermissions() {
    }

    /** Nombre en español que se muestra en la interfaz para cada rol predefinido. */
    public static String displayName(RoleCode code) {
        return switch (code) {
            case ADMIN -> "Administrador";
            case LIMITED_ADMIN -> "Administrador limitado";
            case TECHNICIAN -> "Técnico";
            case LIMITED_TECHNICIAN -> "Técnico limitado";
            case VIEW_ONLY -> "Solo visualización";
            case REQUESTER -> "Solicitante";
            case USER_CREATED -> "Rol personalizado";
        };
    }

    /** Descripción de qué puede hacer cada rol predefinido, para la columna "Descripción" del listado. */
    public static String defaultDescription(RoleCode code) {
        return switch (code) {
            case ADMIN ->
                    "Acceso completo a todos los módulos: puede crear, ver, editar y eliminar cualquier registro, incluidos los de otros usuarios, y gestionar los Ajustes.";
            case LIMITED_ADMIN ->
                    "Casi el mismo acceso que Administrador, pero no puede gestionar personas ni equipos, ni entrar a los Ajustes del sistema.";
            case TECHNICIAN ->
                    "Crea y trabaja en órdenes de trabajo, activos y ubicaciones. Solo puede editar o eliminar lo que él mismo creó, salvo que se le asigne el permiso extra de editar lo de otros.";
            case LIMITED_TECHNICIAN ->
                    "Acceso de solo lectura a la mayoría de los módulos (órdenes, activos, ubicaciones, repuestos), con permiso para subir archivos.";
            case VIEW_ONLY ->
                    "Puede ver todo el sistema, incluidos los registros de otros usuarios, pero no puede crear, editar ni eliminar nada.";
            case REQUESTER ->
                    "Fuera del equipo de mantenimiento: solo puede crear y ver sus propias solicitudes, para reportar un problema o pedir trabajo.";
            case USER_CREATED -> "";
        };
    }

    public static void apply(Role role, RoleCode code) {
        List<PermissionEntity> all = Arrays.asList(PermissionEntity.values());
        switch (code) {
            case ADMIN -> {
                role.setCreatePermissions(new HashSet<>(all));
                role.setEditOtherPermissions(new HashSet<>(all));
                role.setDeleteOtherPermissions(new HashSet<>(all));
                role.setViewOtherPermissions(new HashSet<>(all));
                role.setViewPermissions(new HashSet<>(all));
            }
            case LIMITED_ADMIN -> {
                role.setCreatePermissions(filterOut(all, PermissionEntity.PEOPLE_AND_TEAMS, PermissionEntity.REQUESTS));
                role.setEditOtherPermissions(filterOut(all, PermissionEntity.PEOPLE_AND_TEAMS));
                role.setViewOtherPermissions(new HashSet<>(all));
                role.setViewPermissions(filterOut(all, PermissionEntity.SETTINGS));
                role.setDeleteOtherPermissions(new HashSet<>());
            }
            case TECHNICIAN -> {
                role.setCreatePermissions(Set.of(
                        PermissionEntity.WORK_ORDERS, PermissionEntity.ASSETS,
                        PermissionEntity.LOCATIONS, PermissionEntity.FILES));
                role.setEditOtherPermissions(new HashSet<>());
                role.setDeleteOtherPermissions(new HashSet<>());
                role.setViewOtherPermissions(Set.of(
                        PermissionEntity.WORK_ORDERS, PermissionEntity.PARTS_AND_MULTIPARTS,
                        PermissionEntity.LOCATIONS, PermissionEntity.ASSETS));
                role.setViewPermissions(Set.of(
                        PermissionEntity.WORK_ORDERS, PermissionEntity.LOCATIONS, PermissionEntity.ASSETS,
                        PermissionEntity.CATEGORIES, PermissionEntity.PREVENTIVE_MAINTENANCES, PermissionEntity.METERS));
            }
            case LIMITED_TECHNICIAN -> {
                role.setCreatePermissions(Set.of(PermissionEntity.FILES));
                role.setEditOtherPermissions(new HashSet<>());
                role.setDeleteOtherPermissions(new HashSet<>());
                role.setViewOtherPermissions(Set.of(
                        PermissionEntity.ASSETS, PermissionEntity.PARTS_AND_MULTIPARTS, PermissionEntity.LOCATIONS));
                role.setViewPermissions(Set.of(
                        PermissionEntity.WORK_ORDERS, PermissionEntity.CATEGORIES, PermissionEntity.PARTS_AND_MULTIPARTS,
                        PermissionEntity.LOCATIONS, PermissionEntity.ASSETS, PermissionEntity.PREVENTIVE_MAINTENANCES,
                        PermissionEntity.METERS));
            }
            case VIEW_ONLY -> {
                role.setCreatePermissions(new HashSet<>());
                role.setEditOtherPermissions(new HashSet<>());
                role.setDeleteOtherPermissions(new HashSet<>());
                role.setViewOtherPermissions(new HashSet<>(all));
                role.setViewPermissions(filterOut(all, PermissionEntity.SETTINGS));
            }
            case REQUESTER -> {
                role.setCreatePermissions(Set.of(PermissionEntity.REQUESTS, PermissionEntity.FILES));
                role.setEditOtherPermissions(new HashSet<>());
                role.setDeleteOtherPermissions(new HashSet<>());
                role.setViewOtherPermissions(new HashSet<>());
                role.setViewPermissions(Set.of(PermissionEntity.REQUESTS, PermissionEntity.CATEGORIES));
            }
            case USER_CREATED -> {
                // Rol personalizado: sin permisos hasta que se configuren a mano.
            }
        }
    }

    private static Set<PermissionEntity> filterOut(List<PermissionEntity> all, PermissionEntity... exclude) {
        Set<PermissionEntity> excluded = Set.of(exclude);
        return all.stream().filter(pe -> !excluded.contains(pe)).collect(Collectors.toSet());
    }
}
