package com.tuempresa.cmms.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.scheduling.concurrent.ThreadPoolTaskExecutor;

import java.util.concurrent.Executor;

/**
 * Sin esto, Spring encuentra multiples TaskExecutor candidatos (los que
 * registra WebSocketConfig para STOMP: clientInboundChannelExecutor,
 * clientOutboundChannelExecutor, brokerChannelExecutor) y no sabe cual usar
 * para los metodos @Async (ej. InvitationMailService), asi que cae a un
 * executor por defecto poco eficiente (crea un hilo nuevo por tarea, sin
 * pool). Definir un bean llamado exactamente "taskExecutor" resuelve la
 * ambiguedad -- Spring lo usa automaticamente para @Async.
 */
@Configuration
public class AsyncConfig {

    @Bean(name = "taskExecutor")
    public Executor taskExecutor() {
        ThreadPoolTaskExecutor executor = new ThreadPoolTaskExecutor();
        executor.setCorePoolSize(2);
        executor.setMaxPoolSize(10);
        executor.setQueueCapacity(50);
        executor.setThreadNamePrefix("cmms-async-");
        executor.initialize();
        return executor;
    }
}
