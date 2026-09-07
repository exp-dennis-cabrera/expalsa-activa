package com.tuempresa.cmms.dto.response;

import java.time.Instant;

/**
 * Copia fiel de ReadingHistogramDTO real: un punto del grafico de lecturas,
 * con el promedio del periodo y cuantas lecturas lo componen.
 */
public record ReadingHistogramResponse(Instant date, double value, int count) {
}
