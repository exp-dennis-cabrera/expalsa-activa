package com.tuempresa.cmms.dto.request;

import jakarta.validation.constraints.NotBlank;

public record CancelRequestRequest(@NotBlank String reason) {
}
