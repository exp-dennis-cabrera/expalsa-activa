package com.tuempresa.cmms.dto.response;

import com.tuempresa.cmms.model.enums.NotificationType;

import java.time.Instant;

/**
 * Igual estructura que la Notification real: "notificationType" indica el
 * modulo y "resourceId" el ID dentro de ese modulo -- juntos permiten al
 * cliente saber a que pantalla navegar al hacer clic.
 */
public record NotificationResponse(
        Long id,
        NotificationType notificationType,
        String title,
        String message,
        Long resourceId,
        boolean seen,
        Instant createdAt
) {
}
