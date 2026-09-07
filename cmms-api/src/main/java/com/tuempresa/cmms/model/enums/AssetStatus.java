package com.tuempresa.cmms.model.enums;

/**
 * Igual que AssetStatus real de Atlas: 7 estados, cada uno marcado
 * internamente como "realmente arriba" o "realmente abajo" -- usado para
 * decidir cuando arranca/termina un periodo de inactividad (AssetDowntime).
 */
public enum AssetStatus {
    OPERATIONAL(true),
    DOWN(false),
    MODERNIZATION(true),
    STANDBY(true),
    INSPECTION_SCHEDULED(true),
    COMMISSIONING(true),
    EMERGENCY_SHUTDOWN(false);

    private final boolean up;

    AssetStatus(boolean up) {
        this.up = up;
    }

    public boolean isReallyDown() {
        return !up;
    }
}
