package com.tuempresa.cmms.dto.request;

/**
 * Igual alcance que POST /meters/search real (SearchCriteria/FilterField),
 * adaptado a los filtros concretos que ofrecemos: texto libre, activo,
 * ubicacion, y solo-vencidas.
 */
public record MeterSearchRequest(String search, Long assetId, Long locationId, Long categoryId,
                                 Boolean pastDueOnly,
                                 /** true = incluir los deshabilitados. Por defecto se ocultan. */
                                 Boolean includeDisabled,
                                 Integer page, Integer size) {
}
