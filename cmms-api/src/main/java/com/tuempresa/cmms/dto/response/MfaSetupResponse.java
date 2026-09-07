package com.tuempresa.cmms.dto.response;

public record MfaSetupResponse(String secret, String otpAuthUri) {
}
