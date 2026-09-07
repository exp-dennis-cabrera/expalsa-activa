package com.tuempresa.cmms.security;

import com.tuempresa.cmms.exception.ForbiddenOperationException;

import java.util.regex.Pattern;

/**
 * Politica de complejidad de contrasena (control ISO 27001 A.5.17): minimo
 * 8 caracteres (ya validado con @Size en los DTOs), al menos una mayuscula,
 * una minuscula y un numero. No exigimos simbolo especial a proposito --
 * exigir demasiado tiende a que la gente anote la contrasena en un papel,
 * contraproducente para seguridad real.
 */
public final class PasswordPolicy {

    private static final Pattern UPPERCASE = Pattern.compile("[A-Z]");
    private static final Pattern LOWERCASE = Pattern.compile("[a-z]");
    private static final Pattern DIGIT = Pattern.compile("[0-9]");

    private PasswordPolicy() {
    }

    public static void validate(String password) {
        if (!UPPERCASE.matcher(password).find() || !LOWERCASE.matcher(password).find() || !DIGIT.matcher(password).find()) {
            throw new ForbiddenOperationException(
                    "La contraseña debe incluir al menos una mayúscula, una minúscula y un número.");
        }
    }
}
