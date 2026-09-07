package com.tuempresa.cmms.dto.request;

public record UpdateUserSettingsRequest(
        Boolean emailNotified,
        Boolean emailUpdatesForWorkOrders,
        Boolean emailUpdatesForRequests,
        Boolean statsForAssignedWorkOrders
) {
}
