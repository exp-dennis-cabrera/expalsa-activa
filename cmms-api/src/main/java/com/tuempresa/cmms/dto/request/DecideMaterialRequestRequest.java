package com.tuempresa.cmms.dto.request;

import com.tuempresa.cmms.model.enums.MaterialRequestStatus;
import jakarta.validation.constraints.NotNull;

import java.util.List;
import java.util.Map;

/**
 * Mismo contrato que usaria el webhook real del ERP el dia que se conecte:
 * status final + (opcional) cantidad aprobada por repuesto para soportar
 * aprobacion parcial + motivo si fue rechazada + quien decidio del lado ERP.
 */
public record DecideMaterialRequestRequest(
        @NotNull MaterialRequestStatus status,
        Map<Long, Integer> approvedQuantitiesByItemId,
        String rejectionReason,
        String decidedByErp
) {
}
