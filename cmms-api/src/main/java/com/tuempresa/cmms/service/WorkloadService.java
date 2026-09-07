package com.tuempresa.cmms.service;

import com.tuempresa.cmms.dto.request.ScheduleWorkloadRequest;
import com.tuempresa.cmms.dto.request.UpdateShiftRequest;
import com.tuempresa.cmms.dto.response.*;
import com.tuempresa.cmms.exception.ForbiddenOperationException;
import com.tuempresa.cmms.exception.ResourceNotFoundException;
import com.tuempresa.cmms.model.entity.ShiftDay;
import com.tuempresa.cmms.model.entity.User;
import com.tuempresa.cmms.model.entity.WorkOrder;
import com.tuempresa.cmms.repository.ShiftDayRepository;
import com.tuempresa.cmms.repository.UserRepository;
import com.tuempresa.cmms.repository.WorkOrderRepository;
import com.tuempresa.cmms.security.CurrentUserProvider;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.*;
import java.time.temporal.ChronoUnit;
import java.util.*;
import java.util.stream.Collectors;

/**
 * Replica el WorkloadService.java real de Atlas, con una mejora real sobre
 * el original: turnos con hora de inicio/fin (el original solo guarda
 * "minutos disponibles" con inicio fijo a las 8am hardcodeado, por lo que
 * ni siquiera el sistema real soporta turnos nocturnos que cruzan
 * medianoche). Aqui, un turno se "atribuye" al dia de la semana en que
 * empieza, aunque su ventana real se extienda al dia calendario siguiente.
 */
@Service
@RequiredArgsConstructor
public class WorkloadService {

    private final WorkOrderRepository workOrderRepository;
    private final UserRepository userRepository;
    private final ShiftDayRepository shiftDayRepository;
    private final com.tuempresa.cmms.repository.ShiftExceptionRepository shiftExceptionRepository;
    private final com.tuempresa.cmms.repository.TeamRepository teamRepository;
    private final WorkOrderService workOrderService;
    private final CurrentUserProvider currentUser;
    private final com.tuempresa.cmms.repository.OrganizationRepository organizationRepository;
    private final PermissionService permissionService;

    private record ShiftWindow(Instant start, Instant end) {
        int durationMinutes() {
            return (int) ChronoUnit.MINUTES.between(start, end);
        }
    }

    @Transactional(readOnly = true)
    public WorkloadOverviewResponse getOverview(LocalDate startDate, LocalDate endDate, List<Long> userIds) {
        List<Long> scopedUserIds = resolveScopedUserIds(userIds);
        List<User> users = scopedUserIds == null
                ? userRepository.findAllWithRole()
                : userRepository.findAllById(scopedUserIds);

        List<WorkloadDayResponse> days = new ArrayList<>();
        int totalTeamCapacity = 0;
        double totalTeamAllocated = 0;
        // Todo se carga ANTES del recorrido, en 3 consultas fijas: la zona
        // horaria, los turnos de todos los usuarios y sus excepciones del
        // rango. Dentro del bucle no se consulta nada, igual que en el
        // original -- alli los turnos ya vienen colgados del usuario.
        java.time.ZoneId zona = zonaOrganizacion();
        var idsUsuarios = users.stream().map(User::getId).toList();

        java.util.Map<String, ShiftDay> turnos = idsUsuarios.isEmpty()
                ? java.util.Map.of()
                : shiftDayRepository.findByUserIdIn(idsUsuarios).stream()
                        .collect(java.util.stream.Collectors.toMap(
                                s -> s.getUser().getId() + "|" + s.getDayOfWeek(),
                                s -> s, (a, b) -> a));

        java.util.Map<String, com.tuempresa.cmms.model.entity.ShiftException> excepciones =
                idsUsuarios.isEmpty()
                        ? java.util.Map.of()
                        : shiftExceptionRepository
                                .findByUserIdInAndExceptionDateBetween(idsUsuarios, startDate, endDate).stream()
                                .collect(java.util.stream.Collectors.toMap(
                                        e -> e.getUser().getId() + "|" + e.getExceptionDate(),
                                        e -> e, (a, b) -> a));

        for (LocalDate date = startDate; !date.isAfter(endDate); date = date.plusDays(1)) {
            int dayCapacity = 0;
            double dayAllocated = 0;
            List<WorkloadUserDayResponse> userDays = new ArrayList<>();

            for (User user : users) {
                Optional<ShiftWindow> window = getUserShiftWindow(user, date, zona, turnos, excepciones);
                int capacityMinutes = window.map(ShiftWindow::durationMinutes).orElse(0);

                List<WorkOrder> userWOs = window.isPresent()
                        ? workOrderRepository.findByPrimaryAssigneeAndEstimatedStartDateBetween(
                                user.getId(), window.get().start(), window.get().end())
                        : List.of();

                double allocatedMinutes = userWOs.stream()
                        .mapToDouble(wo -> wo.getEstimatedDurationMinutes() != null ? wo.getEstimatedDurationMinutes() : 0)
                        .sum();

                userDays.add(new WorkloadUserDayResponse(
                        user.getId(), fullName(user), capacityMinutes, allocatedMinutes,
                        userWOs.stream().map(this::toWorkloadWorkOrder).toList()
                ));

                dayCapacity += capacityMinutes;
                dayAllocated += allocatedMinutes;
            }

            days.add(new WorkloadDayResponse(date, date.getDayOfWeek().name(), dayCapacity, dayAllocated, userDays));
            totalTeamCapacity += dayCapacity;
            totalTeamAllocated += dayAllocated;
        }

        return new WorkloadOverviewResponse(startDate, endDate, totalTeamCapacity, totalTeamAllocated, days);
    }

    /**
     * Restringe que personas puede ver/programar cada usuario: Admin y Admin
     * Limitado ven a todo el mundo (o lo que pidan explicitamente). Cualquier
     * otro rol (ej. "Jefe de Refrigeracion") solo puede ver/programar gente
     * que comparta al menos un Equipo (subarea) con el, sin importar que
     * pida en el parametro -- si intenta pedir a alguien fuera de su
     * subarea, simplemente se lo filtra, no rompe la request.
     * Devuelve null cuando no hay restriccion y no se pidio nada especifico
     * (equivale a "todos").
     */
    private List<Long> resolveScopedUserIds(List<Long> requestedUserIds) {
        String role = currentUser.get().getRoleName();
        boolean unrestricted = com.tuempresa.cmms.model.enums.RoleNames.ADMIN.equalsIgnoreCase(role)
                || com.tuempresa.cmms.model.enums.RoleNames.LIMITED_ADMIN.equalsIgnoreCase(role);

        if (unrestricted) {
            return (requestedUserIds == null || requestedUserIds.isEmpty()) ? null : requestedUserIds;
        }

        List<Long> teamMemberIds = teamRepository.findByMembers_Id(currentUser.userId()).stream()
                .flatMap(t -> t.getMembers().stream())
                .map(User::getId)
                .distinct()
                .toList();

        // No pertenece a ningun equipo -> solo se ve a si mismo.
        if (teamMemberIds.isEmpty()) {
            return List.of(currentUser.userId());
        }

        if (requestedUserIds != null && !requestedUserIds.isEmpty()) {
            return requestedUserIds.stream().filter(teamMemberIds::contains).toList();
        }
        return teamMemberIds;
    }

    @Transactional(readOnly = true)
    public UnscheduledWorkOrdersResponse getUnscheduled() {
        List<WorkOrder> unscheduled = workOrderRepository.findUnscheduled();

        Map<String, Long> statusCounts = unscheduled.stream()
                .collect(Collectors.groupingBy(wo -> wo.getStatus().name(), Collectors.counting()));

        Instant now = Instant.now();
        Instant in48h = now.plus(48, ChronoUnit.HOURS);
        int overdueCount = (int) unscheduled.stream()
                .filter(wo -> wo.getDueDate() != null && wo.getDueDate().isBefore(now)).count();
        int dueSoonCount = (int) unscheduled.stream()
                .filter(wo -> wo.getDueDate() != null && wo.getDueDate().isAfter(now) && wo.getDueDate().isBefore(in48h)).count();

        return new UnscheduledWorkOrdersResponse(
                statusCounts, overdueCount, dueSoonCount,
                unscheduled.stream().map(this::toWorkloadWorkOrder).toList()
        );
    }

    /**
     * Programa una orden: usa la ventana real del turno de la persona ese
     * dia (que puede cruzar medianoche si es turno nocturno), valida que no
     * se exceda la capacidad, y busca el primer hueco libre sin chocar con
     * otras ordenes ya programadas dentro de esa misma ventana.
     */
    @Transactional
    public WorkOrderResponse scheduleWorkOrder(Long workOrderId, ScheduleWorkloadRequest request) {
        WorkOrder wo = workOrderRepository.findById(workOrderId)
                .orElseThrow(() -> new ResourceNotFoundException("Work order no encontrado: id=" + workOrderId));
        if (!permissionService.hasEditPermission(com.tuempresa.cmms.model.enums.PermissionEntity.WORK_ORDERS,
                wo.getCreatedBy() != null ? wo.getCreatedBy().getId() : null, java.util.Set.of())) {
            throw new com.tuempresa.cmms.exception.ForbiddenOperationException("No tienes permiso para reprogramar esta orden de trabajo.");
        }

        if (request.localDate() == null) {
            wo.setEstimatedStartDate(null);
            return workOrderService.toResponse(workOrderRepository.save(wo));
        }

        User assignedUser = request.primaryUserId() != null
                ? userRepository.findById(request.primaryUserId())
                        .orElseThrow(() -> new ResourceNotFoundException("Usuario no encontrado"))
                : wo.getPrimaryAssignee();
        if (assignedUser == null) {
            throw new ForbiddenOperationException("Se requiere un trabajador principal para programar la orden.");
        }

        List<Long> scoped = resolveScopedUserIds(List.of(assignedUser.getId()));
        boolean allowed = scoped == null || scoped.contains(assignedUser.getId());
        if (!allowed) {
            throw new ForbiddenOperationException(
                    "No puedes programar a " + fullName(assignedUser) + ": no pertenece a tu equipo/subarea.");
        }

        double durationHours = request.estimatedDurationHours() != null
                ? request.estimatedDurationHours()
                : (wo.getEstimatedDurationMinutes() != null ? wo.getEstimatedDurationMinutes() / 60.0 : 1.0);
        int requiredMinutes = (int) Math.round(durationHours * 60);

        var idUsuario = java.util.List.of(assignedUser.getId());
        var turnosUsuario = shiftDayRepository.findByUserIdIn(idUsuario).stream()
                .collect(java.util.stream.Collectors.toMap(
                        s -> s.getUser().getId() + "|" + s.getDayOfWeek(), s -> s, (a, b) -> a));
        var excepcionesUsuario = shiftExceptionRepository
                .findByUserIdInAndExceptionDateBetween(idUsuario, request.localDate(), request.localDate()).stream()
                .collect(java.util.stream.Collectors.toMap(
                        e -> e.getUser().getId() + "|" + e.getExceptionDate(), e -> e, (a, b) -> a));

        ShiftWindow window = getUserShiftWindow(assignedUser, request.localDate(), zonaOrganizacion(),
                turnosUsuario, excepcionesUsuario)
                .orElseThrow(() -> new ForbiddenOperationException(
                        fullName(assignedUser) + " no tiene turno configurado para " + request.localDate() + "."));

        List<WorkOrder> existing = workOrderRepository
                .findByPrimaryAssigneeAndEstimatedStartDateBetween(assignedUser.getId(), window.start(), window.end())
                .stream()
                .filter(w -> !w.getId().equals(workOrderId))
                .sorted(Comparator.comparing(WorkOrder::getEstimatedStartDate))
                .toList();

        double allocatedMinutes = existing.stream()
                .mapToDouble(w -> w.getEstimatedDurationMinutes() != null ? w.getEstimatedDurationMinutes() : 0)
                .sum();

        if (allocatedMinutes + requiredMinutes > window.durationMinutes()) {
            throw new ForbiddenOperationException(String.format(
                    "Se excederia la capacidad de %s el %s. Requerido: %d min, disponible: %.0f min.",
                    fullName(assignedUser), request.localDate(), requiredMinutes, window.durationMinutes() - allocatedMinutes));
        }

        Instant cursor = window.start();
        Instant foundStart = null;

        for (WorkOrder other : existing) {
            Instant otherStart = other.getEstimatedStartDate();
            Instant otherEnd = otherStart.plus(
                    other.getEstimatedDurationMinutes() != null ? other.getEstimatedDurationMinutes() : 60, ChronoUnit.MINUTES);

            if (!otherEnd.isAfter(cursor)) continue;
            if (!cursor.plus(requiredMinutes, ChronoUnit.MINUTES).isAfter(otherStart)) {
                foundStart = cursor;
                break;
            }
            cursor = otherEnd;
        }
        if (foundStart == null && !cursor.plus(requiredMinutes, ChronoUnit.MINUTES).isAfter(window.end())) {
            foundStart = cursor;
        }
        if (foundStart == null) {
            throw new ForbiddenOperationException(
                    "No hay un hueco disponible el " + request.localDate() + " para la duracion requerida.");
        }

        wo.setPrimaryAssignee(assignedUser);
        wo.setEstimatedStartDate(foundStart);
        if (request.estimatedDurationHours() != null) {
            wo.setEstimatedDurationMinutes(requiredMinutes);
        }

        return workOrderService.toResponse(workOrderRepository.save(wo));
    }

    // ---- turnos ----

    @Transactional(readOnly = true)
    public List<ShiftDayResponse> getShift(Long userId) {
        Map<String, ShiftDay> byDay = shiftDayRepository.findByUserId(userId).stream()
                .collect(Collectors.toMap(ShiftDay::getDayOfWeek, s -> s));

        return Arrays.stream(DayOfWeek.values())
                .map(d -> {
                    ShiftDay existing = byDay.get(d.name());
                    return existing != null
                            ? new ShiftDayResponse(d.name(), existing.getEnabled(), existing.getStartTime(),
                                    existing.getEndTime(), existing.getDurationMinutes(), existing.crossesMidnight())
                            : new ShiftDayResponse(d.name(), false, null, null, 0, false);
                })
                .toList();
    }

    @Transactional
    public List<ShiftDayResponse> updateShift(Long userId, List<UpdateShiftRequest.ShiftDayInput> days) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("Usuario no encontrado: id=" + userId));

        days.forEach(input -> {
            ShiftDay shiftDay = shiftDayRepository.findByUserIdAndDayOfWeek(userId, input.dayOfWeek())
                    .orElseGet(() -> {
                        ShiftDay newDay = new ShiftDay();
                        newDay.setOrganizationId(currentUser.organizationId());
                        newDay.setUser(user);
                        newDay.setDayOfWeek(input.dayOfWeek());
                        return newDay;
                    });
            shiftDay.setEnabled(input.enabled());
            shiftDay.setStartTime(input.startTime());
            shiftDay.setEndTime(input.endTime());
            shiftDayRepository.save(shiftDay);
        });

        return getShift(userId);
    }

    /**
     * Calcula la ventana real [inicio, fin) del turno de una persona para un
     * dia de la semana dado, anclada a esa fecha calendario -- si el turno
     * cruza medianoche (ej. 18:00 -> 07:00), el fin cae en el dia siguiente.
     */
    @Transactional(readOnly = true)
    public List<com.tuempresa.cmms.dto.response.ShiftExceptionResponse> getShiftExceptions(Long userId) {
        return shiftExceptionRepository.findByUserIdOrderByExceptionDateAsc(userId).stream()
                .map(e -> new com.tuempresa.cmms.dto.response.ShiftExceptionResponse(
                        e.getId(), e.getExceptionDate(), e.getAvailabilityMinutes(),
                        e.getEnabled(), e.getReason()))
                .toList();
    }

    /** Crea o actualiza la excepcion de esa fecha (una por usuario y dia). */
    @Transactional
    public com.tuempresa.cmms.dto.response.ShiftExceptionResponse saveShiftException(
            Long userId, com.tuempresa.cmms.dto.request.ShiftExceptionRequest request) {
        permissionService.requireView(com.tuempresa.cmms.model.enums.PermissionEntity.PEOPLE_AND_TEAMS);
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("Usuario no encontrado: id=" + userId));

        var excepcion = shiftExceptionRepository
                .findByUserIdAndExceptionDate(userId, request.exceptionDate())
                .orElseGet(() -> {
                    var nueva = new com.tuempresa.cmms.model.entity.ShiftException();
                    nueva.setOrganizationId(user.getOrganizationId());
                    nueva.setUser(user);
                    nueva.setExceptionDate(request.exceptionDate());
                    return nueva;
                });

        excepcion.setEnabled(Boolean.TRUE.equals(request.enabled()));
        excepcion.setAvailabilityMinutes(
                request.availabilityMinutes() != null ? Math.max(0, request.availabilityMinutes()) : 0);
        excepcion.setReason(request.reason());
        var guardada = shiftExceptionRepository.save(excepcion);

        return new com.tuempresa.cmms.dto.response.ShiftExceptionResponse(
                guardada.getId(), guardada.getExceptionDate(), guardada.getAvailabilityMinutes(),
                guardada.getEnabled(), guardada.getReason());
    }

    @Transactional
    public void deleteShiftException(Long exceptionId) {
        permissionService.requireView(com.tuempresa.cmms.model.enums.PermissionEntity.PEOPLE_AND_TEAMS);
        shiftExceptionRepository.deleteById(exceptionId);
    }

    /** Zona horaria configurada en la organizacion (por defecto la del servidor). */
    /**
     * Zona horaria de la organizacion.
     *
     * IMPORTANTE: quien la necesite en un bucle debe leerla UNA vez y
     * pasarla, no llamar a este metodo por cada iteracion.
     * getUserShiftWindow se ejecuta por cada usuario y cada dia: con 20
     * usuarios eran ~280 consultas identicas, y el planificador se quedaba
     * cargando. No se cachea en un campo porque este servicio es unico
     * para toda la aplicacion y se compartiria entre organizaciones.
     */
    private java.time.ZoneId zonaOrganizacion() {
        return organizationRepository.findById(currentUser.organizationId())
                .map(o -> o.getTimezone() != null
                        ? java.time.ZoneId.of(o.getTimezone())
                        : java.time.ZoneId.systemDefault())
                .orElse(java.time.ZoneId.systemDefault());
    }

    /**
     * Ventana de trabajo de un usuario en un dia.
     *
     * Mismo orden que getUserCapacityForDay real: primero la excepcion de
     * esa fecha, y si no hay, el turno semanal.
     *
     * Al igual que el original, NO consulta la base: recibe los turnos y
     * excepciones ya cargados. Alli eso ocurre porque cuelgan del usuario;
     * aca viven en tablas propias y se cargan en lote antes del recorrido.
     */
    private Optional<ShiftWindow> getUserShiftWindow(
            User user, LocalDate date, java.time.ZoneId zona,
            java.util.Map<String, ShiftDay> turnosPorUsuarioYDia,
            java.util.Map<String, com.tuempresa.cmms.model.entity.ShiftException> excepcionesPorUsuarioYFecha) {
        // Igual orden que getUserCapacityForDay real: PRIMERO se busca una
        // excepcion para esa fecha concreta (vacaciones, feriado, media
        // jornada). Si existe, manda sobre el turno semanal.
        var e = excepcionesPorUsuarioYFecha.get(user.getId() + "|" + date);
        if (e != null) {
            if (!Boolean.TRUE.equals(e.getEnabled()) || e.getAvailabilityMinutes() == null
                    || e.getAvailabilityMinutes() <= 0) {
                return Optional.empty();  // ese dia no trabaja
            }
            // Jornada reducida: se cuenta desde el inicio del turno normal;
            // si no hay turno ese dia, desde las 00:00.
            ShiftDay turnoBase = turnosPorUsuarioYDia.get(user.getId() + "|" + date.getDayOfWeek().name());
            java.time.LocalTime inicio = turnoBase != null && turnoBase.getStartTime() != null
                    ? turnoBase.getStartTime()
                    : java.time.LocalTime.MIDNIGHT;
            Instant start = date.atTime(inicio).atZone(zona).toInstant();
            return Optional.of(new ShiftWindow(
                    start, start.plus(e.getAvailabilityMinutes(), java.time.temporal.ChronoUnit.MINUTES)));
        }

        return Optional.ofNullable(turnosPorUsuarioYDia.get(user.getId() + "|" + date.getDayOfWeek().name()))
                .filter(ShiftDay::getEnabled)
                .filter(s -> s.getStartTime() != null && s.getEndTime() != null && s.getDurationMinutes() > 0)
                .map(s -> {
                    // Zona horaria de la ORGANIZACION, no UTC.
                    //
                    // El contenedor corre en UTC, asi que un turno de 07:00
                    // a 15:00 se interpretaba como 02:00-10:00 hora de
                    // Ecuador, y las ordenes de esas franjas caian en el dia
                    // equivocado. En el turno nocturno (19:00-07:00) el
                    // desfase de 5 horas lo cruzaba de dia por completo.
                    Instant start = date.atTime(s.getStartTime()).atZone(zona).toInstant();
                    LocalDate endDate = s.crossesMidnight() ? date.plusDays(1) : date;
                    Instant end = endDate.atTime(s.getEndTime()).atZone(zona).toInstant();
                    return new ShiftWindow(start, end);
                });
    }

    private WorkloadWorkOrderResponse toWorkloadWorkOrder(WorkOrder wo) {
        Double hours = wo.getEstimatedDurationMinutes() != null ? wo.getEstimatedDurationMinutes() / 60.0 : null;
        return new WorkloadWorkOrderResponse(wo.getId(), wo.getTitle(), wo.getStatus(), hours, wo.getEstimatedStartDate(), wo.getDueDate());
    }

    private String fullName(User u) {
        String first = u.getFirstName() != null ? u.getFirstName() : "";
        String last = u.getLastName() != null ? u.getLastName() : "";
        return (first + " " + last).trim();
    }
}
