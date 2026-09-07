package com.tuempresa.cmms.dto.request;

import jakarta.validation.constraints.NotNull;

public record CreateWorkOrderLinkRequest(@NotNull Long linkedWorkOrderId) {
}
