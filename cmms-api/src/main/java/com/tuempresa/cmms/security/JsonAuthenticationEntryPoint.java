package com.tuempresa.cmms.security;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.tuempresa.cmms.exception.ApiError;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.http.MediaType;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.web.AuthenticationEntryPoint;
import org.springframework.stereotype.Component;

import java.io.IOException;

/**
 * Por defecto, Spring Security responde 403 con cuerpo vacio cuando una
 * request no esta autenticada (token ausente/invalido/expirado). Eso rompe
 * el frontend, que espera 401 + JSON para detectar sesion expirada y
 * renovar el token automaticamente. Este EntryPoint corrige ese comportamiento.
 */
@Component
public class JsonAuthenticationEntryPoint implements AuthenticationEntryPoint {

    private final ObjectMapper objectMapper = new ObjectMapper().findAndRegisterModules();

    @Override
    public void commence(HttpServletRequest request, HttpServletResponse response,
                          AuthenticationException authException) throws IOException {
        response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
        response.setContentType(MediaType.APPLICATION_JSON_VALUE);
        ApiError error = new ApiError(401, "Sesion expirada o token invalido.");
        response.getWriter().write(objectMapper.writeValueAsString(error));
    }
}
