package com.tuempresa.cmms.config;

import com.tuempresa.cmms.security.JsonAuthenticationEntryPoint;
import com.tuempresa.cmms.security.JwtAuthenticationFilter;
import com.tuempresa.cmms.tenant.TenantFilter;
import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.config.annotation.authentication.configuration.AuthenticationConfiguration;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.cors.CorsConfigurationSource;

@Configuration
@EnableWebSecurity
@EnableMethodSecurity
@RequiredArgsConstructor
public class SecurityConfig {

    private final JwtAuthenticationFilter jwtAuthFilter;
    private final com.tuempresa.cmms.security.ApiKeyAuthFilter apiKeyAuthFilter;
    private final TenantFilter tenantFilter;
    private final CorsConfigurationSource corsConfigurationSource;
    private final JsonAuthenticationEntryPoint jsonAuthenticationEntryPoint;

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http
                .cors(cors -> cors.configurationSource(corsConfigurationSource))
                .csrf(AbstractHttpConfigurer::disable)
                .sessionManagement(sm -> sm.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .exceptionHandling(ex -> ex.authenticationEntryPoint(jsonAuthenticationEntryPoint))
                // Cabeceras de seguridad HTTP (control ISO 27001 -- mitigan
                // clickjacking, sniffing de tipo de contenido, y fuerzan HTTPS
                // en el navegador una vez que ya se visito por HTTPS al menos una vez).
                .headers(headers -> headers
                        .frameOptions(frame -> frame.deny())
                        .contentTypeOptions(contentTypeOptions -> {})
                        .httpStrictTransportSecurity(hsts -> hsts
                                .includeSubDomains(true)
                                .maxAgeInSeconds(31536000))
                        .referrerPolicy(referrer -> referrer
                                .policy(org.springframework.security.web.header.writers.ReferrerPolicyHeaderWriter.ReferrerPolicy.STRICT_ORIGIN_WHEN_CROSS_ORIGIN))
                )
                .authorizeHttpRequests(auth -> auth
                        // Rutas de autenticacion PUBLICAS: entrar, registrarse,
                        // renovar el token y recuperar la contraseña. Se listan
                        // una por una y NO como "/auth/**".
                        //
                        // El comodin era el bug: dejaba publico tambien /auth/me,
                        // que SI requiere sesion. Con el token vencido, esa ruta
                        // entraba sin usuario y estallaba con un 500 ("No hay un
                        // usuario autenticado") en vez de devolver 401 -- que es
                        // lo que dispara el refresco automatico del token.
                        // Resultado: el perfil no cargaba, el avatar quedaba en
                        // "?" y el menu lateral se vaciaba.
                        .requestMatchers(
                                "/auth/login", "/auth/register", "/auth/refresh",
                                "/auth/mfa/verify", "/auth/accept-invitation",
                                "/auth/forgot-password", "/auth/reset-password",
                                "/auth/verify-email", "/auth/resend-verification"
                        ).permitAll()
                        .requestMatchers(
                                "/swagger-ui.html",
                                "/swagger-ui/**",
                                "/v3/api-docs/**",
                                "/ws/**",
                                "/ws-native",
                                "/ws-native/**"
                        ).permitAll()
                        .anyRequest().authenticated()
                )
                // La llave de API se evalua ANTES del token: si la peticion
                // trae una valida, ya queda autenticada.
                .addFilterBefore(apiKeyAuthFilter, UsernamePasswordAuthenticationFilter.class)
                .addFilterBefore(jwtAuthFilter, UsernamePasswordAuthenticationFilter.class)
                .addFilterAfter(tenantFilter, JwtAuthenticationFilter.class);

        return http.build();
    }

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder(12);
    }

    @Bean
    public AuthenticationManager authenticationManager(AuthenticationConfiguration config) throws Exception {
        return config.getAuthenticationManager();
    }
}
