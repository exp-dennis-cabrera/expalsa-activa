package com.tuempresa.cmms.service;

import com.tuempresa.cmms.model.entity.Meter;
import com.tuempresa.cmms.model.entity.User;
import com.tuempresa.cmms.model.enums.MeterReadingStatus;
import com.tuempresa.cmms.model.enums.PermissionEntity;
import com.tuempresa.cmms.repository.MeterRepository;
import com.tuempresa.cmms.repository.TeamRepository;
import com.tuempresa.cmms.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;

/**
 * Aviso de lecturas de medidor no registradas.
 *
 * Pasada la hora limite (readingDeadlineHour, 7:00 por defecto), los
 * medidores que debian leerse y no se leyeron quedan INCUMPLIDOS. Este
 * servicio los agrupa y avisa UNA sola vez al dia.
 *
 * Un aviso por medidor seria inservible con 40 medidores: se manda un
 * resumen con los tres primeros nombres y el resto contado.
 *
 * El reparto sigue la misma regla de visibilidad del listado:
 *   - Quien tiene permiso de "ver de otros" recibe TODOS los incumplidos.
 *   - Los integrantes del equipo responsable reciben solo los suyos.
 *   - Un medidor sin equipo entra en el resumen de los supervisores.
 */
@Service
@Slf4j
@RequiredArgsConstructor
public class MeterReadingAlertService {

    private final MeterRepository meterRepository;
    private final UserRepository userRepository;
    private final TeamRepository teamRepository;
    private final AssetService assetService;
    private final NotificationService notificationService;

    /** Cuantos nombres se enumeran antes de resumir con "y N mas". */
    private static final int NOMBRES_A_MOSTRAR = 3;

    @Transactional(readOnly = true)
    public void avisarLecturasPendientes() {
        List<Meter> incumplidos = meterRepository.findAll().stream()
                .filter(m -> !Boolean.TRUE.equals(m.getDisabled()))
                .filter(m -> assetService.estadoLecturaDe(m) == MeterReadingStatus.INCUMPLIDO)
                .toList();

        if (incumplidos.isEmpty()) {
            log.info("Aviso de lecturas: no hay medidores incumplidos.");
            return;
        }

        // Quien ve todo: supervisores y administradores.
        List<User> supervisores = userRepository.findAll().stream()
                .filter(u -> u.getRole() != null
                        && u.getRole().getViewOtherPermissions().contains(PermissionEntity.METERS))
                .toList();

        supervisores.forEach(sup -> notificar(sup, incumplidos));

        // Y cada equipo recibe solo los medidores a su cargo, sin repetir a
        // quien ya lo recibio como supervisor.
        Set<Long> yaAvisados = new HashSet<>(supervisores.stream().map(User::getId).toList());

        Map<Long, List<Meter>> porEquipo = new LinkedHashMap<>();
        incumplidos.stream()
                .filter(m -> m.getTeam() != null)
                .forEach(m -> porEquipo.computeIfAbsent(m.getTeam().getId(), k -> new ArrayList<>()).add(m));

        porEquipo.forEach((equipoId, medidores) ->
                teamRepository.findById(equipoId).ifPresent(equipo ->
                        equipo.getMembers().stream()
                                .filter(u -> !yaAvisados.contains(u.getId()))
                                .forEach(u -> notificar(u, medidores))));

        log.info("Aviso de lecturas: {} medidor(es) incumplido(s), {} supervisor(es) notificado(s).",
                incumplidos.size(), supervisores.size());
    }

    private void notificar(User destinatario, List<Meter> medidores) {
        String titulo = medidores.size() == 1
                ? "1 medidor sin lectura"
                : medidores.size() + " medidores sin lectura";

        String nombres = medidores.stream()
                .limit(NOMBRES_A_MOSTRAR)
                .map(Meter::getName)
                .reduce((a, b) -> a + ", " + b)
                .orElse("");

        int restantes = medidores.size() - Math.min(NOMBRES_A_MOSTRAR, medidores.size());
        String detalle = restantes > 0 ? nombres + " y " + restantes + " más" : nombres;

        notificationService.notifyUser(
                destinatario,
                // Tipo propio: la app movil lo usa para abrir el listado de
                // medidores con el filtro de pendientes ya activo.
                "METER_READING_OVERDUE",
                titulo,
                detalle + " no se registraron antes de la hora límite.",
                // Sin recurso concreto: la notificacion lleva a la lista, no
                // a un medidor en particular.
                0L);
    }
}
