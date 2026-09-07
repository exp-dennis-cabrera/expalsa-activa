package com.tuempresa.cmms.dto.request;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record RegisterRequest(
        @NotBlank(message = "El nombre de la organización es obligatorio")
        String organizationName,

        @NotBlank @Email
        String email,

        @NotBlank @Size(min = 8, message = "La contraseña debe tener al menos 8 caracteres")
        String password,

        @NotBlank
        String firstName,

        String lastName
) {
}
