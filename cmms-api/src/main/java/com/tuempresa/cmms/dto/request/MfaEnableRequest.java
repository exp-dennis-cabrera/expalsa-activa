package com.tuempresa.cmms.dto.request;

import jakarta.validation.constraints.NotBlank;

public record MfaEnableRequest(@NotBlank String code) {
}
