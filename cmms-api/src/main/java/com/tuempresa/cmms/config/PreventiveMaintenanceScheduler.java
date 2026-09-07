package com.tuempresa.cmms.config;

import com.tuempresa.cmms.service.PreventiveMaintenanceService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

/**
 * Reemplaza los triggers persistentes de Quartz del sistema real: cada 15
 * minutos revisa todos los Mantenimientos Preventivos activos y genera la
 * orden de trabajo si ya vencio su programacion. Mismo resultado para el
 * usuario (ordenes recurrentes generadas solas), sin la dependencia de
 * Quartz ni su almacen de jobs persistente.
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class PreventiveMaintenanceScheduler {

    private final PreventiveMaintenanceService preventiveMaintenanceService;

    @Scheduled(fixedRate = 15 * 60 * 1000, initialDelay = 30 * 1000)
    public void checkDuePreventiveMaintenances() {
        try {
            preventiveMaintenanceService.runDueCheck();
        } catch (Exception e) {
            log.error("Error revisando mantenimientos preventivos vencidos", e);
        }
    }
}
