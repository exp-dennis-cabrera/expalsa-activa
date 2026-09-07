package com.tuempresa.cmms.dto.request;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.PositiveOrZero;

/**
 * El valor no puede ser negativo: un medidor nunca marca menos que cero, y
 * un negativo arruinaria el calculo de consumo (que resta lecturas
 * consecutivas).
 */
public record AddMeterReadingRequest(
        @NotNull(message = "La lectura es obligatoria")
        @PositiveOrZero(message = "La lectura no puede ser negativa")
        Double value) {
}
