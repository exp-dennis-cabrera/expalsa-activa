package com.tuempresa.cmms.model.enums;

/**
 * Los 5 roles por defecto de Atlas CMMS:
 * https://docs.atlas-cmms.com/initial-setup-and-configuration/setting/roles-setting/
 *
 * El campo Role.name en la base de datos sigue siendo texto libre (para permitir
 * roles personalizados como hace Atlas), pero estas constantes son los valores
 * reservados que el sistema reconoce para aplicar reglas de negocio.
 */
public final class RoleNames {

    public static final String ADMIN = "ADMIN";
    public static final String LIMITED_ADMIN = "LIMITED_ADMIN";
    public static final String TECHNICIAN = "TECHNICIAN";
    public static final String LIMITED_TECHNICIAN = "LIMITED_TECHNICIAN";
    public static final String VIEW_ONLY = "VIEW_ONLY";
    public static final String REQUESTER = "REQUESTER";

    private RoleNames() {
    }
}
