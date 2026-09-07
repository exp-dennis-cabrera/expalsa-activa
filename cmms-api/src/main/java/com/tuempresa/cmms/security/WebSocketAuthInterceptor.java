package com.tuempresa.cmms.security;

import lombok.RequiredArgsConstructor;

import org.springframework.messaging.Message;
import org.springframework.messaging.MessageChannel;
import org.springframework.messaging.simp.stomp.StompCommand;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.messaging.support.ChannelInterceptor;
import org.springframework.messaging.support.MessageHeaderAccessor;

import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.userdetails.UserDetails;

import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class WebSocketAuthInterceptor implements ChannelInterceptor {

    private final JwtTokenProvider jwtTokenProvider;
    private final CustomUserDetailsService userDetailsService;

    @Override
    public Message<?> preSend(
            Message<?> message,
            MessageChannel channel
    ) {

        StompHeaderAccessor accessor =
                MessageHeaderAccessor.getAccessor(
                        message,
                        StompHeaderAccessor.class
                );

        /*
         * Igual que Atlas:
         *
         * autenticamos SOLO STOMP CONNECT.
         *
         * DISCONNECT, UNSUBSCRIBE, HEARTBEAT, etc.
         * quedan en manos de Spring Security Messaging.
         */
        if (
                accessor != null
                && StompCommand.CONNECT.equals(accessor.getCommand())
        ) {

            String token =
                    accessor.getFirstNativeHeader("token");

            if (token != null && !token.isBlank()) {

                if (!jwtTokenProvider.isValid(token)) {
                    return message;
                }

                if (
                        !"access".equals(
                                jwtTokenProvider.getTokenType(token)
                        )
                ) {
                    return message;
                }

                Long userId =
                        jwtTokenProvider.getUserId(token);

                UserDetails userDetails =
                        userDetailsService.loadUserById(userId);

                UsernamePasswordAuthenticationToken authentication =
                        new UsernamePasswordAuthenticationToken(
                                userDetails,
                                null,
                                userDetails.getAuthorities()
                        );

                accessor.setUser(authentication);
            }
        }

        return message;
    }
}
