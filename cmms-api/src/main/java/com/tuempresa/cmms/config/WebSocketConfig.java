package com.tuempresa.cmms.config;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;

import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Lazy;

import org.springframework.messaging.simp.config.MessageBrokerRegistry;

import org.springframework.scheduling.TaskScheduler;

import org.springframework.web.socket.config.annotation.EnableWebSocketMessageBroker;
import org.springframework.web.socket.config.annotation.StompEndpointRegistry;
import org.springframework.web.socket.config.annotation.WebSocketMessageBrokerConfigurer;
import org.springframework.web.socket.config.annotation.WebSocketTransportRegistration;


@Configuration
@EnableWebSocketMessageBroker
public class WebSocketConfig
        implements WebSocketMessageBrokerConfigurer {


    /*
     * Frontend autorizado.
     *
     * No usamos "*" porque el WebSocket transporta información
     * autenticada y telemetría OT.
     */
    @Value("${cors.allowed-origin}")
    private String frontendUrl;


    /*
     * Scheduler administrado por Spring.
     *
     * @Lazy evita el ciclo de inicialización documentado por
     * Spring cuando el scheduler del broker es utilizado desde
     * WebSocketMessageBrokerConfigurer.
     */
    private TaskScheduler messageBrokerTaskScheduler;


    @Autowired
    public void setMessageBrokerTaskScheduler(
            @Lazy TaskScheduler taskScheduler
    ) {
        this.messageBrokerTaskScheduler =
                taskScheduler;
    }


    // ========================================================
    // MESSAGE BROKER
    // ========================================================

    @Override
    public void configureMessageBroker(
            MessageBrokerRegistry config
    ) {

        /*
         * Conservamos todos los destinos existentes.
         *
         * Esto mantiene compatibilidad con:
         *
         * - notificaciones
         * - imports/exports Atlas
         * - usuarios
         * - telemetría OT
         *
         * Los futuros dominios OT vivirán igualmente bajo /ot.
         */
        config
                .enableSimpleBroker(
                        "/notifications",
                        "/exports",
                        "/imports",
                        "/user",
                        "/ot"
                )

                /*
                 * Heartbeat server <-> client.
                 *
                 * Primer valor:
                 *   frecuencia con la que Spring puede enviar.
                 *
                 * Segundo:
                 *   frecuencia esperada desde el cliente.
                 *
                 * La negociación STOMP decide finalmente
                 * qué heartbeat utiliza cada conexión.
                 */
                .setHeartbeatValue(
                        new long[] {
                                10_000,
                                10_000
                        }
                )

                .setTaskScheduler(
                        messageBrokerTaskScheduler
                );


        config.setApplicationDestinationPrefixes(
                "/app"
        );

        config.setUserDestinationPrefix(
                "/user"
        );
    }


    // ========================================================
    // ENDPOINTS
    // ========================================================

    @Override
    public void registerStompEndpoints(
            StompEndpointRegistry registry
    ) {

        /*
         * NUEVO ENDPOINT.
         *
         * WebSocket nativo para la nueva capa RealtimeProvider.
         *
         * No SockJS.
         */
        registry
                .addEndpoint(
                        "/ws-native"
                )
                .setAllowedOrigins(
                        frontendUrl
                );


        /*
         * ENDPOINT LEGACY / COMPATIBILIDAD.
         *
         * NO eliminar.
         *
         * Continúa atendiendo:
         *
         * - frontend anterior
         * - clientes SockJS
         * - potencial app móvil existente
         *
         * La migración puede hacerse gradualmente.
         */
        registry
                .addEndpoint(
                        "/ws"
                )
                .setAllowedOrigins(
                        frontendUrl
                )
                .withSockJS();
    }


    // ========================================================
    // TRANSPORT HARDENING
    // ========================================================

    @Override
    public void configureWebSocketTransport(
            WebSocketTransportRegistration registry
    ) {

        /*
         * Un cliente que abre WebSocket pero nunca envía
         * STOMP CONNECT no puede ocupar la sesión
         * indefinidamente.
         *
         * 30 segundos es suficientemente amplio también
         * para conexiones móviles lentas.
         */
        registry.setTimeToFirstMessage(
                30_000
        );
    }
}
