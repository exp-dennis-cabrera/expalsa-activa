package com.tuempresa.cmms.dto.response;

import java.time.Instant;
import java.util.List;

public record MeterResponse(
        Long id, String name, String unit, Integer updateFrequencyDays,
        Double lastReading, Instant lastReadingDate, Instant nextReadingDue, Boolean pastDue,
        com.tuempresa.cmms.model.enums.MeterReadingStatus readingStatus,
        Long assetId, String assetName, Long locationId, String locationName,
        Long categoryId, String categoryName, Long createdById, String createdByName,
        List<Long> assignedUserIds, List<String> assignedUserNames,
        List<MeterReadingResponse> readings, String imageUrl, Instant createdAt
,
        /** Equipo responsable: determina quien ve el medidor. */
        Long teamId, String teamName,
        /** true = oculto del listado; sus lecturas se conservan. */
        Boolean disabled,
        /**
         * Lectura ACUMULADA: arrastre de equipos anteriores + lectura
         * fisica actual. Es la que se usa para el consumo historico.
         */
        Double accumulatedReading,
        /** Numero de serie del equipo fisico instalado. */
        String deviceSerialNumber,
        /** Cuando se instalo el equipo actual. Null si nunca se reemplazo. */
        java.time.Instant deviceInstalledAt) {
    public record MeterReadingResponse(Long id, Double value, String createdByName, Instant readingDate,
            /**
             * Arrastre del equipo que dio esta lectura. Sumado al valor da
             * el acumulado real, para que la grafica sea continua a traves
             * de un reemplazo de medidor.
             */
            Double deviceOffset) {
    }
}
