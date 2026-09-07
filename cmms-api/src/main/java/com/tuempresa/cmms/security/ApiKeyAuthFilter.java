package com.tuempresa.cmms.security;

import com.tuempresa.cmms.repository.ApiKeyRepository;
import com.tuempresa.cmms.service.ApiKeyService;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.time.Instant;

/**
 * Copia de security/ApiKeyAuthFilter.java de Atlas CMMS (commit 44069b69).
 *
 * Autentica peticiones que traen el encabezado "x-api-key". La llave hereda
 * los permisos del usuario al que pertenece.
 *
 * Va ANTES del filtro JWT: si la peticion trae llave valida, ya queda
 * autenticada y el filtro de token no tiene nada que hacer.
 */
@Component
@RequiredArgsConstructor
public class ApiKeyAuthFilter extends OncePerRequestFilter {

    private final ApiKeyRepository apiKeyRepository;
    private final CustomUserDetailsService userDetailsService;

    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                     HttpServletResponse response,
                                     FilterChain chain) throws ServletException, IOException {

        String apiKey = request.getHeader("x-api-key");

        if (apiKey != null && !apiKey.isBlank()
                && SecurityContextHolder.getContext().getAuthentication() == null) {
            // Se busca por el HASH: la llave en claro nunca se guarda.
            apiKeyRepository.findByCode(ApiKeyService.hashKey(apiKey)).ifPresent(key -> {
                var userDetails = userDetailsService.loadUserById(key.getUser().getId());
                var authentication = new UsernamePasswordAuthenticationToken(
                        userDetails, null, userDetails.getAuthorities());
                SecurityContextHolder.getContext().setAuthentication(authentication);

                // Registra el uso, para detectar llaves olvidadas.
                key.setLastUsed(Instant.now());
                apiKeyRepository.save(key);
            });
        }

        chain.doFilter(request, response);
    }
}
