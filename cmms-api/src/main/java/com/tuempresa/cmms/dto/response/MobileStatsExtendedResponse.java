package com.tuempresa.cmms.dto.response;

/**
 * Copia fiel de MobileWOStatsExtended real: los 4 numeros de la pantalla
 * de estadisticas del celular.
 *
 * - complete / completeWeek: ordenes completadas en total y en los ultimos 7 dias
 * - compliantRate / compliantRateWeek: proporcion completada A TIEMPO (0 a 1)
 */
public record MobileStatsExtendedResponse(
        long complete,
        long completeWeek,
        double compliantRate,
        double compliantRateWeek
) {
}
