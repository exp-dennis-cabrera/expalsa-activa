package com.tuempresa.cmms.dto.request;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;

public record SendTestEmailRequest(@NotBlank @Email String toEmail) {
}
