package com.tuempresa.cmms.dto.request;

import jakarta.validation.constraints.NotBlank;

public record MfaVerifyRequest(
        @NotBlank String challengeToken,
        @NotBlank String code
) {
}
