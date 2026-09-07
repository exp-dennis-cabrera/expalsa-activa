package com.tuempresa.cmms.dto.request;

import com.tuempresa.cmms.model.enums.WorkOrderPriority;
import com.tuempresa.cmms.model.enums.WorkOrderType;
import jakarta.validation.constraints.NotBlank;

import java.time.Instant;
import java.util.Set;

public record CreateWorkOrderRequest(
        @NotBlank(message = "El titulo es obligatorio")
        String title,

        String description,
        WorkOrderPriority priority,
        WorkOrderType type,
        Long assetId,
        String assetStatus,
        Long locationId,
        Long categoryId,
        Instant dueDate,
        Instant estimatedStartDate,
        Integer estimatedDurationMinutes,
        Boolean requiresSignature,
        Long vendorId,
        Long teamId,
        Long primaryAssigneeId,
        Set<Long> additionalAssigneeIds,
        /**
         * Igual que el campo "tasks" del formulario real: la lista de
         * verificacion se define AL CREAR la orden, no despues. Cada texto
         * se convierte en una tarea pendiente de la orden.
         */
        java.util.List<String> taskLabels
) {
}
