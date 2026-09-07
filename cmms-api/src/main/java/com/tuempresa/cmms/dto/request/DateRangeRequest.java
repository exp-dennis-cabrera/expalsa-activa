package com.tuempresa.cmms.dto.request;

import java.time.Instant;

/** Copia fiel de DateRange real: rango de fechas para el histograma. */
public record DateRangeRequest(Instant start, Instant end) {
}
