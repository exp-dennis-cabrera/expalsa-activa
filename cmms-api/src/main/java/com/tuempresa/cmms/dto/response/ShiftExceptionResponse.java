package com.tuempresa.cmms.dto.response;

import java.time.LocalDate;

/** Una excepcion de turno: fecha puntual que manda sobre el turno semanal. */
public record ShiftExceptionResponse(
        Long id, LocalDate exceptionDate, Integer availabilityMinutes,
        Boolean enabled, String reason) {
}
