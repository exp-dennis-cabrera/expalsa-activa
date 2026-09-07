package com.tuempresa.cmms.model.enums;

/**
 * Estado de cumplimiento de la lectura diaria de un medidor.
 *
 * Distinguir PENDIENTE de INCUMPLIDO es lo que permite al supervisor ver
 * a las 8 AM si el turno nocturno hizo su trabajo: antes de la hora limite
 * un medidor sin leer es normal, despues ya es una falla.
 */
public enum MeterReadingStatus {
    /** Ya se registro la lectura de hoy. */
    AL_DIA,
    /** Falta registrar, pero todavia no vence la ventana del turno. */
    PENDIENTE,
    /** Paso la hora limite y nadie registro la lectura. */
    INCUMPLIDO
}
