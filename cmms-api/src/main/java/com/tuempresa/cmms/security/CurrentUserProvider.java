package com.tuempresa.cmms.security;

import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;

/**
 * Punto unico de acceso al usuario autenticado de la request actual.
 * Evita repetir el casteo a CmmsUserDetails en cada service.
 */
@Component
public class CurrentUserProvider {

    public CmmsUserDetails get() {
        Object principal = SecurityContextHolder.getContext().getAuthentication().getPrincipal();
        if (principal instanceof CmmsUserDetails userDetails) {
            return userDetails;
        }
        // Se lanza una excepcion de AUTENTICACION, no de estado: asi el
        // cliente recibe 401 (y dispara el refresco del token) en vez de un
        // 500 que parece una falla del servidor.
        throw new org.springframework.security.authentication.AuthenticationCredentialsNotFoundException(
                "No hay un usuario autenticado en el contexto actual");
    }

    public Long organizationId() {
        return get().getOrganizationId();
    }

    public Long userId() {
        return get().getUserId();
    }
}
