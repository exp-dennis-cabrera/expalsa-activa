package com.tuempresa.cmms.dto.request;

import com.tuempresa.cmms.model.enums.WorkOrderStatus;
import jakarta.validation.constraints.NotNull;

public record UpdateWorkOrderStatusRequest(
        @NotNull(message = "El estado es obligatorio")
        WorkOrderStatus status,
        String feedback,
        String signature
) {
}
