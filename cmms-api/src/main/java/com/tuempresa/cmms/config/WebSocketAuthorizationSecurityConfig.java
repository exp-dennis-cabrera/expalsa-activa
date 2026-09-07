package com.tuempresa.cmms.config;

import org.springframework.messaging.simp.SimpMessageType;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.annotation.web.messaging.MessageSecurityMetadataSourceRegistry;
import org.springframework.security.config.annotation.web.socket.AbstractSecurityWebSocketMessageBrokerConfigurer;

@Configuration
@SuppressWarnings("deprecation")
public class WebSocketAuthorizationSecurityConfig
        extends AbstractSecurityWebSocketMessageBrokerConfigurer {

    @Override
    protected void configureInbound(
            final MessageSecurityMetadataSourceRegistry messages
    ) {

        /*
         * OT es server -> browser.
         *
         * Un cliente nunca puede inyectar datos
         * al broker OT.
         */
        messages
                .simpMessageDestMatchers("/ot/**")
                .denyAll()

                /*
                 * Primera etapa:
                 * monitoreo OT para administradores.
                 */
                .simpSubscribeDestMatchers("/ot/ice/live")
                .hasAnyRole(
                        "ADMIN",
                        "LIMITED_ADMIN"
                )

                /*
                 * Patron Atlas:
                 * todo STOMP requiere usuario autenticado.
                 */
                .simpTypeMatchers(SimpMessageType.DISCONNECT)
                .permitAll()

                .anyMessage()
                .authenticated();
    }

    @Override
    protected boolean sameOriginDisabled() {
        return true;
    }
}
