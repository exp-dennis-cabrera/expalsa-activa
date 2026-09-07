package com.tuempresa.cmms.security;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;

/**
 * Valida el token de cada peticion y deja al usuario en el contexto de
 * seguridad.
 *
 * Mismo diseño que JwtTokenFilter real: si viene un token y NO es valido,
 * se limpia el contexto y se CORTA la peticion con 401 -- no se deja pasar.
 *
 * Es importante que corte aca y no mas adelante: si la peticion sigue su
 * curso sin usuario, puede llegar a un controlador que lo da por sentado y
 * estallar con un 500. El cliente veria un error de servidor en vez de un
 * 401, y por lo tanto no intentaria renovar el token -- que fue justo el
 * bug que dejaba el menu lateral vacio y el avatar en "?".
 *
 * Sin token (header ausente) la peticion sigue: puede ser una ruta publica
 * como iniciar sesion. Si no lo era, Spring Security la rechaza despues.
 */
@Component
@RequiredArgsConstructor
public class JwtAuthenticationFilter extends OncePerRequestFilter {

    private final JwtTokenProvider jwtTokenProvider;
    private final CustomUserDetailsService userDetailsService;

    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                     HttpServletResponse response,
                                     FilterChain chain) throws ServletException, IOException {

        String header = request.getHeader("Authorization");

        if (header != null && header.startsWith("Bearer ")) {
            String token = header.substring(7);
            try {
                if (!jwtTokenProvider.isValid(token)) {
                    rechazar(response, "Sesión expirada. Vuelve a iniciar sesión.");
                    return;
                }
                if (!"access".equals(jwtTokenProvider.getTokenType(token))) {
                    // Un token de refresco no sirve para consultar datos: solo
                    // se acepta en /auth/refresh.
                    rechazar(response, "Tipo de token inválido.");
                    return;
                }

                Long userId = jwtTokenProvider.getUserId(token);
                UserDetails userDetails = userDetailsService.loadUserById(userId);

                UsernamePasswordAuthenticationToken authentication =
                        new UsernamePasswordAuthenticationToken(userDetails, null, userDetails.getAuthorities());
                SecurityContextHolder.getContext().setAuthentication(authentication);

            } catch (Exception ex) {
                // Token corrupto, usuario borrado, o cualquier otro fallo al
                // resolverlo: se trata como sesion invalida, nunca como error
                // interno del servidor.
                rechazar(response, "Sesión inválida. Vuelve a iniciar sesión.");
                return;
            }
        }

        chain.doFilter(request, response);
    }

    /** Limpia el contexto y responde 401, cortando la peticion. */
    private void rechazar(HttpServletResponse response, String mensaje) throws IOException {
        SecurityContextHolder.clearContext();
        response.setStatus(HttpStatus.UNAUTHORIZED.value());
        response.setContentType("application/json;charset=UTF-8");
        response.getWriter().write(
                "{\"status\":401,\"message\":\"" + mensaje + "\"}");
    }
}
