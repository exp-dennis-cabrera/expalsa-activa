package com.tuempresa.cmms.service;

import com.tuempresa.cmms.dto.request.CreatePreventiveMaintenanceRequest;
import com.tuempresa.cmms.dto.request.ScheduleInput;
import com.tuempresa.cmms.dto.response.PmCalendarEventResponse;
import com.tuempresa.cmms.dto.response.PreventiveMaintenanceResponse;
import com.tuempresa.cmms.dto.response.ScheduleResponse;
import com.tuempresa.cmms.dto.response.WorkOrderResponse;
import com.tuempresa.cmms.exception.ResourceNotFoundException;
import com.tuempresa.cmms.model.entity.*;
import com.tuempresa.cmms.model.enums.RecurrenceBasedOn;
import com.tuempresa.cmms.model.enums.WorkOrderStatus;
import com.tuempresa.cmms.repository.*;
import com.tuempresa.cmms.security.CurrentUserProvider;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.ZoneOffset;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Optional;

/**
 * Replica el modelo de datos y las reglas de recurrencia del
 * PreventiveMaintenanceService.java + ScheduleService.java reales de Atlas
 * (DAILY/WEEKLY/MONTHLY/YEARLY, basado en fecha programada o en fecha de
 * completado). Diferencia honesta: el original dispara cada Schedule con un
 * trigger de Quartz persistente; aqui, PreventiveMaintenanceScheduler
 * (@Scheduled de Spring) revisa periodicamente cuales PM ya vencieron y
 * genera la orden -- mismo resultado para el usuario, sin la dependencia de
 * Quartz. La recurrencia WEEKLY tambien se simplifica: usamos el intervalo
 * de semanas desde el ancla en vez de recalcular el dia exacto de la semana
 * seleccionado.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class PreventiveMaintenanceService {

    private final PreventiveMaintenanceRepository preventiveMaintenanceRepository;
    private final ScheduleRepository scheduleRepository;
    private final CategoryRepository categoryRepository;
    private final AssetRepository assetRepository;
    private final LocationRepository locationRepository;
    private final TeamRepository teamRepository;
    private final UserRepository userRepository;
    private final WorkOrderRepository workOrderRepository;
    private final WorkOrderService workOrderService;
    private final PreventiveMaintenanceMailService mailService;
    private final TaskService taskService;
    private final CustomFieldService customFieldService;
    private final NotificationService notificationService;
    private final CurrentUserProvider currentUser;

    @Transactional
    public PreventiveMaintenanceResponse create(CreatePreventiveMaintenanceRequest request) {
        PreventiveMaintenance pm = new PreventiveMaintenance();
        pm.setOrganizationId(currentUser.organizationId());
        pm.setCustomId("PM" + String.format("%06d", preventiveMaintenanceRepository.count() + 1));
        applyFields(pm, request);

        Schedule schedule = new Schedule();
        schedule.setOrganizationId(currentUser.organizationId());
        applySchedule(schedule, request.schedule());
        pm.setSchedule(scheduleRepository.save(schedule));

        return toResponse(preventiveMaintenanceRepository.save(pm));
    }

    @Transactional
    public PreventiveMaintenanceResponse update(Long id, CreatePreventiveMaintenanceRequest request) {
        PreventiveMaintenance pm = findOrThrow(id);
        applyFields(pm, request);
        applySchedule(pm.getSchedule(), request.schedule());
        return toResponse(preventiveMaintenanceRepository.save(pm));
    }

    @Transactional(readOnly = true)
    public List<PreventiveMaintenanceResponse> list() {
        return preventiveMaintenanceRepository.findAll().stream().map(this::toResponse).toList();
    }

    @Transactional(readOnly = true)
    public PreventiveMaintenanceResponse getById(Long id) {
        return toResponse(findOrThrow(id));
    }

    @Transactional
    public void delete(Long id) {
        preventiveMaintenanceRepository.deleteById(id);
    }

    @Transactional
    public PreventiveMaintenanceResponse toggleEnabled(Long id, boolean enabled) {
        PreventiveMaintenance pm = findOrThrow(id);
        pm.getSchedule().setDisabled(!enabled);
        return toResponse(preventiveMaintenanceRepository.save(pm));
    }

    @Transactional(readOnly = true)
    public List<WorkOrderResponse> getWorkOrderHistory(Long id) {
        findOrThrow(id);
        return workOrderRepository.findByParentPreventiveMaintenanceId(id).stream()
                .map(workOrderService::toResponse)
                .toList();
    }

    /** Genera una orden ahora mismo, sin esperar a que la programacion venza. */
    @Transactional
    public WorkOrderResponse generateNow(Long id) {
        PreventiveMaintenance pm = findOrThrow(id);
        return workOrderService.toResponse(generateWorkOrder(pm));
    }

    /**
     * Revisa todos los PM activos y genera la orden si ya vencieron. Llamado
     * por PreventiveMaintenanceScheduler cada cierto tiempo.
     */
    @Transactional
    public void runDueCheck() {
        List<PreventiveMaintenance> active = preventiveMaintenanceRepository.findAllActive();
        Instant now = Instant.now();
        for (PreventiveMaintenance pm : active) {
            Schedule s = pm.getSchedule();
            if (s.getEndsOn() != null && s.getEndsOn().isBefore(now)) continue;

            Instant nextDue = computeNextDueAt(pm);
            if (nextDue != null && !nextDue.isAfter(now)) {
                if (shouldAutoDisable(pm)) {
                    log.warn("PM {} se auto-desactivo: las ultimas {} ordenes generadas nunca fueron atendidas",
                            pm.getId(), STALE_CHECK_COUNT);
                    s.setDisabled(true);
                    preventiveMaintenanceRepository.save(pm);
                    continue;
                }
                try {
                    generateWorkOrder(pm);
                } catch (Exception e) {
                    log.error("No se pudo generar orden para PM {}: {}", pm.getId(), e.getMessage());
                }
                continue;
            }

            maybeSendUpcomingNotification(pm, nextDue, now);
        }
    }

    private static final int STALE_CHECK_COUNT = 5;

    /**
     * Igual que la proteccion real de Atlas en ScheduleService.scheduleWorkOrder:
     * si las ultimas N ordenes generadas por este PM nunca fueron atendidas
     * (nadie les cambio el estado ni comento), se asume que esta generando
     * ruido y se desactiva solo.
     */
    private boolean shouldAutoDisable(PreventiveMaintenance pm) {
        List<WorkOrder> recent = workOrderRepository.findByParentPreventiveMaintenanceId(pm.getId());
        if (recent.size() < STALE_CHECK_COUNT) return false;
        return recent.stream().limit(STALE_CHECK_COUNT).allMatch(w -> w.getFirstReactedAt() == null);
    }

    /**
     * Igual que PreventiveMaintenanceNotificationJob real de Atlas, pero
     * disparado por el mismo barrido periodico en vez de un trigger de
     * Quartz separado. Simplificacion honesta: el original notifica a
     * "todos los admins con permiso de ver Ajustes"; aqui notificamos a
     * los admins del sistema (rol ADMIN/LIMITED_ADMIN) + el trabajador
     * principal del PM, sin ese nivel de permiso granular.
     */
    private void maybeSendUpcomingNotification(PreventiveMaintenance pm, Instant nextDue, Instant now) {
        if (nextDue == null || pm.getDaysBeforeNotification() == null || pm.getDaysBeforeNotification() <= 0) return;

        Instant notifyFrom = nextDue.minus(pm.getDaysBeforeNotification(), ChronoUnit.DAYS);
        if (now.isBefore(notifyFrom)) return;

        // Ya se aviso para este mismo ciclo (evita reenviar cada 15 min)
        if (pm.getLastNotifiedAt() != null && !pm.getLastNotifiedAt().isBefore(notifyFrom)) return;

        List<User> recipients = new ArrayList<>(userRepository.findByRoleNameInAndOrganizationId(
                List.of(com.tuempresa.cmms.model.enums.RoleCode.ADMIN, com.tuempresa.cmms.model.enums.RoleCode.LIMITED_ADMIN),
                pm.getOrganizationId()));
        if (pm.getPrimaryAssignee() != null) {
            recipients.add(pm.getPrimaryAssignee());
        }

        mailService.sendUpcomingNotification(pm, recipients);
        pm.setLastNotifiedAt(now);
        preventiveMaintenanceRepository.save(pm);
    }

    /**
     * Construye la orden directamente (no via WorkOrderService.create()):
     * ese metodo depende del usuario autenticado actual para permisos,
     * organizacion y "creado por" -- inexistente en un job de fondo. Aqui
     * tomamos organizationId directo del PM, y dejamos createdBy en null
     * (orden generada por el sistema, no por una persona).
     */
    private WorkOrder generateWorkOrder(PreventiveMaintenance pm) {
        // Si ya se genero una orden hace menos de 1 minuto, no generar otra --
        // evita duplicados cuando el boton manual "Generar ahora" y el chequeo
        // automatico (@Scheduled) caen casi al mismo tiempo y ambos ven el PM
        // como vencido antes de que el otro alcance a actualizar lastGeneratedAt.
        if (pm.getLastGeneratedAt() != null && pm.getLastGeneratedAt().isAfter(Instant.now().minusSeconds(60))) {
            log.warn("PM {} ya genero una orden hace menos de 1 minuto, se omite para evitar duplicado", pm.getId());
            return workOrderRepository.findByParentPreventiveMaintenanceId(pm.getId()).stream()
                    .max(Comparator.comparing(WorkOrder::getCreatedAt))
                    .orElseThrow(() -> new ResourceNotFoundException("No se encontro la ultima orden generada"));
        }

        Schedule s = pm.getSchedule();

        WorkOrder wo = new WorkOrder();
        wo.setOrganizationId(pm.getOrganizationId());
        wo.setTitle(pm.getTitle());
        wo.setDescription(pm.getDescription());
        wo.setPriority(pm.getPriority() != null ? pm.getPriority() : com.tuempresa.cmms.model.enums.WorkOrderPriority.NONE);
        wo.setType(com.tuempresa.cmms.model.enums.WorkOrderType.PREVENTIVE);
        wo.setStatus(WorkOrderStatus.OPEN);
        wo.setCustomId("WO" + String.format("%06d", workOrderRepository.count() + 1));
        wo.setCategory(pm.getCategory());
        wo.setAsset(pm.getAsset());
        wo.setLocation(pm.getLocation());
        wo.setTeam(pm.getTeam());
        wo.setPrimaryAssignee(pm.getPrimaryAssignee());
        wo.setEstimatedDurationMinutes(pm.getEstimatedDurationMinutes());
        wo.setParentPreventiveMaintenance(pm);
        if (s.getDueDateDelay() != null) {
            wo.setDueDate(Instant.now().plus(s.getDueDateDelay(), ChronoUnit.DAYS));
        }

        WorkOrder saved = workOrderRepository.save(wo);
        workOrderService.recordStatusHistory(saved, saved.getStatus());
        taskService.copyTasksToWorkOrder(pm, saved);
        customFieldService.copyValuesToWorkOrder(pm, saved);

        // Igual que el resto de flujos de creacion: avisa a quien va a
        // hacer el trabajo. Especialmente importante aca porque nadie
        // "crea" esta orden a mano -- si no se avisa, nadie se entera.
        if (saved.getPrimaryAssignee() != null) {
            notificationService.notifyUser(saved.getPrimaryAssignee(), "WORK_ORDER_ASSIGNED",
                    "Nueva orden de mantenimiento preventivo",
                    "\"" + saved.getTitle() + "\" se generó automáticamente y fue asignada a ti.", saved.getId());
        }
        if (saved.getTeam() != null) {
            saved.getTeam().getMembers().forEach(member ->
                    notificationService.notifyUser(member, "WORK_ORDER_ASSIGNED",
                            "Nueva orden de mantenimiento preventivo para tu equipo",
                            "\"" + saved.getTitle() + "\" se generó automáticamente para tu equipo.", saved.getId()));
        }

        pm.setLastGeneratedAt(Instant.now());
        preventiveMaintenanceRepository.save(pm);

        log.info("PM {} ({}) genero la orden #{}", pm.getCustomId(), pm.getName(), saved.getId());
        return saved;
    }

    private Instant computeNextDueAt(PreventiveMaintenance pm) {
        Schedule s = pm.getSchedule();
        if (Boolean.TRUE.equals(s.getDisabled())) return null;

        if (s.getRecurrenceBasedOn() == RecurrenceBasedOn.COMPLETED_DATE) {
            List<WorkOrder> history = workOrderRepository.findByParentPreventiveMaintenanceId(pm.getId());
            Optional<WorkOrder> lastCompleted = history.stream()
                    .filter(w -> w.getStatus() == WorkOrderStatus.COMPLETED && w.getCompletedAt() != null)
                    .max(Comparator.comparing(WorkOrder::getCompletedAt));

            if (lastCompleted.isEmpty()) {
                return pm.getLastGeneratedAt() == null ? s.getStartsOn() : null;
            }
            return addInterval(lastCompleted.get().getCompletedAt(), s);
        }

        if (pm.getLastGeneratedAt() == null) return s.getStartsOn();
        return addInterval(pm.getLastGeneratedAt(), s);
    }

    private Instant addInterval(Instant anchor, Schedule s) {
        return switch (s.getRecurrenceType()) {
            case DAILY -> anchor.plus((long) s.getFrequency(), ChronoUnit.DAYS);
            case WEEKLY -> anchor.plus(7L * s.getFrequency(), ChronoUnit.DAYS);
            case MONTHLY -> anchor.atZone(ZoneOffset.UTC).plusMonths(s.getFrequency()).toInstant();
            case YEARLY -> anchor.atZone(ZoneOffset.UTC).plusYears(s.getFrequency()).toInstant();
        };
    }

    // ---- calendario proyectado ----

    /**
     * Proyecta las proximas fechas de disparo de cada PM activo dentro del
     * rango pedido, avanzando la formula de recurrencia hacia adelante sin
     * modificar nada -- igual idea que el getEvents() real de Atlas (que usa
     * los fireTimes calculados del trigger de Quartz), aqui recalculado a
     * mano ya que no usamos Quartz.
     */
    @Transactional(readOnly = true)
    public List<PmCalendarEventResponse> getProjectedEvents(Instant start, Instant end) {
        List<PreventiveMaintenance> active = preventiveMaintenanceRepository.findAllActive();
        List<PmCalendarEventResponse> events = new ArrayList<>();

        for (PreventiveMaintenance pm : active) {
            Schedule s = pm.getSchedule();
            if (s.getEndsOn() != null && s.getEndsOn().isBefore(start)) continue;

            Instant cursor = pm.getLastGeneratedAt() != null ? addInterval(pm.getLastGeneratedAt(), s) : s.getStartsOn();
            int guard = 0;
            while (cursor.isBefore(end) && guard < 500) {
                guard++;
                if (s.getEndsOn() != null && cursor.isAfter(s.getEndsOn())) break;
                if (!cursor.isBefore(start)) {
                    events.add(new PmCalendarEventResponse(pm.getId(), pm.getTitle(), cursor));
                }
                cursor = addInterval(cursor, s);
            }
        }
        return events;
    }

    // ---- exportar / importar CSV ----

    private static final String CSV_HEADER = "name,title,description,priority,frequency,recurrenceType,recurrenceBasedOn,startsOn,endsOn,daysBeforeNotification";

    @Transactional(readOnly = true)
    public String exportCsv() {
        StringBuilder sb = new StringBuilder(CSV_HEADER).append("\n");
        for (PreventiveMaintenance pm : preventiveMaintenanceRepository.findAll()) {
            Schedule s = pm.getSchedule();
            sb.append(csvEscape(pm.getName())).append(',')
                    .append(csvEscape(pm.getTitle())).append(',')
                    .append(csvEscape(pm.getDescription())).append(',')
                    .append(pm.getPriority()).append(',')
                    .append(s.getFrequency()).append(',')
                    .append(s.getRecurrenceType()).append(',')
                    .append(s.getRecurrenceBasedOn()).append(',')
                    .append(s.getStartsOn()).append(',')
                    .append(s.getEndsOn() != null ? s.getEndsOn() : "").append(',')
                    .append(pm.getDaysBeforeNotification() != null ? pm.getDaysBeforeNotification() : "")
                    .append("\n");
        }
        return sb.toString();
    }

    @Transactional
    public java.util.Map<String, Integer> importCsv(org.springframework.web.multipart.MultipartFile file) {
        int created = 0;
        int failed = 0;
        try (var reader = new java.io.BufferedReader(new java.io.InputStreamReader(file.getInputStream()))) {
            String line = reader.readLine(); // header, se descarta
            while ((line = reader.readLine()) != null) {
                if (line.isBlank()) continue;
                try {
                    String[] cols = parseCsvLine(line);
                    PreventiveMaintenance pm = new PreventiveMaintenance();
                    pm.setOrganizationId(currentUser.organizationId());
                    pm.setCustomId("PM" + String.format("%06d", preventiveMaintenanceRepository.count() + 1));
                    pm.setName(cols[0]);
                    pm.setTitle(cols[1]);
                    pm.setDescription(cols.length > 2 && !cols[2].isBlank() ? cols[2] : null);
                    pm.setPriority(cols.length > 3 && !cols[3].isBlank()
                            ? com.tuempresa.cmms.model.enums.WorkOrderPriority.valueOf(cols[3]) : com.tuempresa.cmms.model.enums.WorkOrderPriority.NONE);
                    pm.setDaysBeforeNotification(cols.length > 9 && !cols[9].isBlank() ? Integer.parseInt(cols[9]) : 3);

                    Schedule schedule = new Schedule();
                    schedule.setOrganizationId(currentUser.organizationId());
                    schedule.setFrequency(Integer.parseInt(cols[4]));
                    schedule.setRecurrenceType(com.tuempresa.cmms.model.enums.RecurrenceType.valueOf(cols[5]));
                    schedule.setRecurrenceBasedOn(RecurrenceBasedOn.valueOf(cols[6]));
                    schedule.setStartsOn(Instant.parse(cols[7]));
                    schedule.setEndsOn(cols.length > 8 && !cols[8].isBlank() ? Instant.parse(cols[8]) : null);
                    pm.setSchedule(scheduleRepository.save(schedule));

                    preventiveMaintenanceRepository.save(pm);
                    created++;
                } catch (Exception e) {
                    log.error("Fila de importacion invalida: {} -- {}", line, e.getMessage());
                    failed++;
                }
            }
        } catch (Exception e) {
            log.error("Error leyendo el CSV de importacion", e);
        }
        return java.util.Map.of("created", created, "failed", failed);
    }

    private String csvEscape(String value) {
        if (value == null) return "";
        if (value.contains(",") || value.contains("\"") || value.contains("\n")) {
            return "\"" + value.replace("\"", "\"\"") + "\"";
        }
        return value;
    }

    private String[] parseCsvLine(String line) {
        List<String> result = new ArrayList<>();
        StringBuilder current = new StringBuilder();
        boolean inQuotes = false;
        for (int i = 0; i < line.length(); i++) {
            char c = line.charAt(i);
            if (c == '"') {
                inQuotes = !inQuotes;
            } else if (c == ',' && !inQuotes) {
                result.add(current.toString());
                current = new StringBuilder();
            } else {
                current.append(c);
            }
        }
        result.add(current.toString());
        return result.toArray(new String[0]);
    }

    private void applyFields(PreventiveMaintenance pm, CreatePreventiveMaintenanceRequest r) {
        pm.setName(r.name());
        pm.setTitle(r.title());
        pm.setDescription(r.description());
        pm.setPriority(r.priority() != null ? r.priority() : pm.getPriority());
        pm.setCategory(r.categoryId() != null ? categoryRepository.findById(r.categoryId()).orElse(null) : null);
        pm.setAsset(r.assetId() != null ? assetRepository.findById(r.assetId()).orElse(null) : null);
        pm.setLocation(r.locationId() != null ? locationRepository.findById(r.locationId()).orElse(null) : null);
        pm.setTeam(r.teamId() != null ? teamRepository.findById(r.teamId()).orElse(null) : null);
        pm.setPrimaryAssignee(r.primaryAssigneeId() != null ? userRepository.findById(r.primaryAssigneeId()).orElse(null) : null);
        pm.setEstimatedDurationMinutes(r.estimatedDurationMinutes());
        pm.setDaysBeforeNotification(r.daysBeforeNotification() != null ? r.daysBeforeNotification() : 3);
    }

    private void applySchedule(Schedule schedule, ScheduleInput input) {
        schedule.setStartsOn(input.startsOn());
        schedule.setFrequency(input.frequency());
        schedule.setEndsOn(input.endsOn());
        schedule.setDueDateDelay(input.dueDateDelay());
        schedule.setRecurrenceType(input.recurrenceType());
        schedule.setRecurrenceBasedOn(input.recurrenceBasedOn());
        schedule.setDaysOfWeek(input.daysOfWeek() != null ? input.daysOfWeek() : List.of());
    }

    private PreventiveMaintenance findOrThrow(Long id) {
        return preventiveMaintenanceRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Mantenimiento preventivo no encontrado: id=" + id));
    }

    private PreventiveMaintenanceResponse toResponse(PreventiveMaintenance pm) {
        Schedule s = pm.getSchedule();
        ScheduleResponse scheduleResponse = new ScheduleResponse(
                s.getDisabled(), s.getStartsOn(), s.getFrequency(), s.getEndsOn(),
                s.getDueDateDelay(), s.getRecurrenceType(), s.getRecurrenceBasedOn(), new java.util.ArrayList<>(s.getDaysOfWeek())
        );
        return new PreventiveMaintenanceResponse(
                pm.getId(), pm.getCustomId(), pm.getName(), pm.getTitle(), pm.getDescription(), pm.getPriority(),
                pm.getCategory() != null ? pm.getCategory().getId() : null,
                pm.getCategory() != null ? pm.getCategory().getName() : null,
                pm.getAsset() != null ? pm.getAsset().getId() : null,
                pm.getAsset() != null ? pm.getAsset().getName() : null,
                pm.getLocation() != null ? pm.getLocation().getId() : null,
                pm.getLocation() != null ? pm.getLocation().getName() : null,
                pm.getTeam() != null ? pm.getTeam().getId() : null,
                pm.getTeam() != null ? pm.getTeam().getName() : null,
                pm.getPrimaryAssignee() != null ? pm.getPrimaryAssignee().getId() : null,
                pm.getPrimaryAssignee() != null ? fullName(pm.getPrimaryAssignee()) : null,
                pm.getEstimatedDurationMinutes(),
                pm.getDaysBeforeNotification(),
                scheduleResponse,
                pm.getLastGeneratedAt(),
                computeNextDueAt(pm),
                pm.getCreatedAt()
        );
    }

    private String fullName(User u) {
        String first = u.getFirstName() != null ? u.getFirstName() : "";
        String last = u.getLastName() != null ? u.getLastName() : "";
        return (first + " " + last).trim();
    }
}
