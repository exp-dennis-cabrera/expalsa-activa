package com.tuempresa.cmms.dto.response;

public record UserSettingsResponse(
        boolean emailNotified,
        boolean emailUpdatesForWorkOrders,
        boolean emailUpdatesForRequests,
        boolean statsForAssignedWorkOrders
) {
}
