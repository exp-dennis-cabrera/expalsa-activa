package com.tuempresa.cmms.config;

import com.tuempresa.cmms.service.MeterReadingAlertService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

/**
 * Aviso diario de lecturas de medidor no registradas.
 *
 * Corre a las 7:05 hora de Ecuador -- cinco minutos despues de la hora
 * limite (readingDeadlineHour = 7), dando margen a quien este registrando
 * justo en el corte.
 *
 * Todos los dias: el turno nocturno cubre tambien fines de semana.
 *
 * Una sola alerta diaria. Insistir haria que la gente la ignore.
 */
@Component
@Slf4j
@RequiredArgsConstructor
public class MeterReadingAlertScheduler {

    private final MeterReadingAlertService alertService;

    @Scheduled(cron = "0 5 7 * * *", zone = "America/Guayaquil")
    public void avisarLecturasPendientes() {
        try {
            alertService.avisarLecturasPendientes();
        } catch (Exception e) {
            // Un fallo del aviso no debe tumbar el programador: manana
            // vuelve a intentarlo.
            log.error("No se pudo enviar el aviso de lecturas pendientes: {}", e.getMessage(), e);
        }
    }
}
