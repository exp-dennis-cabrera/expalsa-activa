package com.tuempresa.cmms.dto.response;

import java.time.Instant;

/** Igual forma que WorkOrderHistory real: que cambio, quien y cuando. */
public record WorkOrderHistoryResponse(Long id, String name, String userName, Instant createdAt) {
}
