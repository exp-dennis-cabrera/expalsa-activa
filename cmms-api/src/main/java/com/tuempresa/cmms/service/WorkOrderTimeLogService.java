package com.tuempresa.cmms.service;

import com.tuempresa.cmms.dto.request.CreateTimeLogRequest;
import com.tuempresa.cmms.dto.response.TimeLogResponse;
import com.tuempresa.cmms.exception.ForbiddenOperationException;
import com.tuempresa.cmms.exception.ResourceNotFoundException;
import com.tuempresa.cmms.model.entity.User;
import com.tuempresa.cmms.model.entity.WorkOrder;
import com.tuempresa.cmms.model.entity.WorkOrderTimeLog;
import com.tuempresa.cmms.model.enums.RoleNames;
import com.tuempresa.cmms.model.enums.WorkOrderStatus;
import com.tuempresa.cmms.repository.UserRepository;
import com.tuempresa.cmms.repository.WorkOrderRepository;
import com.tuempresa.cmms.repository.WorkOrderTimeLogRepository;
import com.tuempresa.cmms.security.CurrentUserProvider;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.Set;

/**
 * Registro de horas trabajadas, con dos modos igual que el "Labor" real de
 * Atlas CMMS: entrada manual (create) y timer en vivo (startTimer/stopTimer).
 * Al iniciar el timer, si la orden esta OPEN se pasa automaticamente a
 * IN_PROGRESS -- mismo comportamiento que controlTimer() en WorkOrderController.java.
 */
@Service
@RequiredArgsConstructor
public class WorkOrderTimeLogService {

    private static final Set<String> CAN_LOG_TIME = Set.of(
            RoleNames.ADMIN, RoleNames.LIMITED_ADMIN, RoleNames.TECHNICIAN, RoleNames.LIMITED_TECHNICIAN);

    private final WorkOrderTimeLogRepository timeLogRepository;
    private final WorkOrderRepository workOrderRepository;
    private final WorkOrderService workOrderService;
    private final UserRepository userRepository;
    private final CurrentUserProvider currentUser;
    private final PermissionService permissionService;

    @Transactional
    public TimeLogResponse create(Long workOrderId, CreateTimeLogRequest request) {
        requireRole(CAN_LOG_TIME, "registrar tiempo trabajado");

        WorkOrder wo = workOrderRepository.findById(workOrderId)
                .orElseThrow(() -> new ResourceNotFoundException("Work order no encontrado: id=" + workOrderId));
        User user = userRepository.findById(currentUser.userId())
                .orElseThrow(() -> new ResourceNotFoundException("Usuario no encontrado"));

        WorkOrderTimeLog log = new WorkOrderTimeLog();
        log.setOrganizationId(currentUser.organizationId());
        log.setWorkOrder(wo);
        log.setUser(user);
        log.setHours(request.hours());
        log.setLogDate(request.logDate() != null ? request.logDate() : LocalDate.now());
        log.setHourlyRateSnapshot(user.getHourlyRate());
        log.setStatus("STOPPED");

        return toResponse(timeLogRepository.save(log));
    }

    @Transactional
    public TimeLogResponse startTimer(Long workOrderId) {
        requireRole(CAN_LOG_TIME, "iniciar el timer de tiempo");

        WorkOrder wo = workOrderRepository.findById(workOrderId)
                .orElseThrow(() -> new ResourceNotFoundException("Work order no encontrado: id=" + workOrderId));
        User user = userRepository.findById(currentUser.userId())
                .orElseThrow(() -> new ResourceNotFoundException("Usuario no encontrado"));

        WorkOrderTimeLog running = findRunningForUser(workOrderId, user.getId());
        if (running != null) {
            return toResponse(running);
        }

        // Igual que Atlas: iniciar el timer avanza la orden a IN_PROGRESS si estaba OPEN.
        if (wo.getStatus() == WorkOrderStatus.OPEN) {
            wo.setStatus(WorkOrderStatus.IN_PROGRESS);
            workOrderRepository.save(wo);
            workOrderService.recordStatusHistory(wo, WorkOrderStatus.IN_PROGRESS);
        }

        WorkOrderTimeLog log = new WorkOrderTimeLog();
        log.setOrganizationId(currentUser.organizationId());
        log.setWorkOrder(wo);
        log.setUser(user);
        log.setHourlyRateSnapshot(user.getHourlyRate());
        log.setStatus("RUNNING");
        log.setStartedAt(Instant.now());

        return toResponse(timeLogRepository.save(log));
    }

    @Transactional
    public TimeLogResponse stopTimer(Long workOrderId) {
        requireRole(CAN_LOG_TIME, "detener el timer de tiempo");

        WorkOrderTimeLog running = findRunningForUser(workOrderId, currentUser.userId());
        if (running == null) {
            throw new ResourceNotFoundException("No hay un timer corriendo para esta orden.");
        }

        double hours = Duration.between(running.getStartedAt(), Instant.now()).toSeconds() / 3600.0;
        running.setHours(round(hours));
        running.setStatus("STOPPED");
        running.setLogDate(LocalDate.now());

        return toResponse(timeLogRepository.save(running));
    }

    @Transactional(readOnly = true)
    public List<TimeLogResponse> list(Long workOrderId) {
        return timeLogRepository.findByWorkOrderId(workOrderId).stream().map(this::toResponse).toList();
    }

    /**
     * Igual que editLabor real: corrige las horas de un registro de tiempo.
     * Sirve sobre todo para el caso tipico en planta -- alguien dejo el
     * cronometro corriendo toda la noche y hay que ajustar el total sin
     * perder el registro. Puede editarlo el dueño del registro, o quien
     * tenga permiso de editar ordenes de otros.
     */
    @Transactional
    public TimeLogResponse updateHours(Long logId, Double hours) {
        WorkOrderTimeLog log = timeLogRepository.findById(logId)
                .orElseThrow(() -> new ResourceNotFoundException("Registro de tiempo no encontrado: id=" + logId));
        boolean esMio = log.getUser() != null && log.getUser().getId().equals(currentUser.userId());
        boolean puedeEditarDeOtros = permissionService.hasEditPermission(
                com.tuempresa.cmms.model.enums.PermissionEntity.WORK_ORDERS, null, java.util.Set.of());
        if (!esMio && !puedeEditarDeOtros) {
            throw new com.tuempresa.cmms.exception.ForbiddenOperationException(
                    "No tienes permiso para editar este registro de tiempo.");
        }
        if (hours == null || hours < 0) {
            throw new IllegalArgumentException("Las horas deben ser un número positivo.");
        }
        log.setHours(hours);
        // Si estaba corriendo, editarlo manualmente lo detiene -- igual que
        // el real, donde guardar el tiempo primario fija una duracion concreta.
        log.setStatus("STOPPED");
        log.setStartedAt(null);
        return toResponse(timeLogRepository.save(log));
    }

    public void delete(Long logId) {
        requireRole(Set.of(RoleNames.ADMIN), "eliminar registros de tiempo");
        WorkOrderTimeLog log = timeLogRepository.findById(logId)
                .orElseThrow(() -> new ResourceNotFoundException("Registro de tiempo no encontrado: id=" + logId));
        timeLogRepository.delete(log);
    }

    private WorkOrderTimeLog findRunningForUser(Long workOrderId, Long userId) {
        return timeLogRepository.findByWorkOrderId(workOrderId).stream()
                .filter(l -> "RUNNING".equals(l.getStatus()) && l.getUser().getId().equals(userId))
                .findFirst().orElse(null);
    }

    private double round(double value) {
        return Math.round(value * 100.0) / 100.0;
    }

    private void requireRole(Set<String> allowedRoles, String action) {
        String role = currentUser.get().getRoleName();
        boolean allowed = role != null && allowedRoles.stream().anyMatch(r -> r.equalsIgnoreCase(role));
        if (!allowed) {
            throw new ForbiddenOperationException("Tu rol (" + role + ") no tiene permiso para " + action + ".");
        }
    }

    private TimeLogResponse toResponse(WorkOrderTimeLog log) {
        boolean running = "RUNNING".equals(log.getStatus());
        Double cost = (log.getHours() != null && log.getHourlyRateSnapshot() != null)
                ? log.getHours() * log.getHourlyRateSnapshot()
                : null;
        String userName = ((log.getUser().getFirstName() != null ? log.getUser().getFirstName() : "") + " "
                + (log.getUser().getLastName() != null ? log.getUser().getLastName() : "")).trim();
        return new TimeLogResponse(
                log.getId(), log.getUser().getId(), userName, log.getHours(), log.getLogDate(), cost,
                running, log.getStartedAt(), log.getCreatedAt());
    }
}
