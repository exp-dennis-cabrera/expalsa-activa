package com.tuempresa.cmms.dto.response;

import java.time.Instant;

/**
 * Un equipo fisico en el historial de un medidor.
 *
 * Alimenta la pestaña "Reemplazos": permite saber que contador estuvo
 * instalado en cada periodo, quien autorizo el cambio y por que.
 */
public record MeterDeviceResponse(
        Long id,
        String serialNumber,
        /** Cuanto acumularon los equipos anteriores a este. */
        Double offsetValue,
        Instant installedAt,
        /** Null = es el equipo instalado ahora. */
        Instant removedAt,
        String replacedByName,
        String notes,
        /** Cuantas lecturas dio este equipo. */
        Long readingCount) {
}
