package com.tuempresa.cmms.controller;

import com.tuempresa.cmms.dto.request.ChangePasswordRequest;
import com.tuempresa.cmms.dto.request.UpdateMyProfileRequest;
import com.tuempresa.cmms.dto.request.UpdateUserSettingsRequest;
import com.tuempresa.cmms.dto.response.MobileOverviewResponse;
import com.tuempresa.cmms.dto.response.MyProfileResponse;
import com.tuempresa.cmms.dto.response.RoleResponse;
import com.tuempresa.cmms.dto.response.UserSettingsResponse;
import com.tuempresa.cmms.dto.response.WorkOrdersOverviewResponse;
import com.tuempresa.cmms.exception.ForbiddenOperationException;
import com.tuempresa.cmms.exception.ResourceNotFoundException;
import com.tuempresa.cmms.model.entity.User;
import com.tuempresa.cmms.model.entity.UserSettings;
import com.tuempresa.cmms.model.entity.WorkOrder;
import com.tuempresa.cmms.model.enums.WorkOrderStatus;
import com.tuempresa.cmms.repository.UserRepository;
import com.tuempresa.cmms.repository.UserSettingsRepository;
import com.tuempresa.cmms.repository.WorkOrderRepository;
import com.tuempresa.cmms.security.CurrentUserProvider;
import com.tuempresa.cmms.service.storage.FileStorageService;
import com.tuempresa.cmms.service.storage.StoredFile;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.List;

/**
 * "Mi cuenta" / Perfil: replica de ProfileCover.tsx + ProfileDetails.tsx +
 * RecentActivity.tsx reales de Atlas.
 */
@RestController
@RequestMapping("/users/me")
@RequiredArgsConstructor
public class MeController {

    private final UserRepository userRepository;
    private final UserSettingsRepository userSettingsRepository;
    private final WorkOrderRepository workOrderRepository;
    private final FileStorageService fileStorageService;
    private final PasswordEncoder passwordEncoder;
    private final CurrentUserProvider currentUser;

    @PatchMapping
    @org.springframework.transaction.annotation.Transactional
    public MyProfileResponse updateProfile(@Valid @RequestBody UpdateMyProfileRequest request) {
        User user = findMe();
        if (request.firstName() != null) user.setFirstName(request.firstName());
        if (request.lastName() != null) user.setLastName(request.lastName());
        if (request.phone() != null) user.setPhone(request.phone());
        if (request.jobTitle() != null) user.setJobTitle(request.jobTitle());
        return toProfileResponse(userRepository.save(user));
    }

    @PostMapping(value = "/avatar", consumes = "multipart/form-data")
    @org.springframework.transaction.annotation.Transactional
    public MyProfileResponse uploadAvatar(@RequestParam("file") MultipartFile file) {
        User user = findMe();
        StoredFile stored = fileStorageService.upload(file, "avatars/" + user.getId());
        user.setAvatarStorageKey(stored.storageKey());
        return toProfileResponse(userRepository.save(user));
    }

    @GetMapping("/settings")
    public UserSettingsResponse getSettings() {
        return toSettingsResponse(findOrCreateSettings());
    }

    @PatchMapping("/settings")
    public UserSettingsResponse updateSettings(@RequestBody UpdateUserSettingsRequest request) {
        UserSettings settings = findOrCreateSettings();
        if (request.emailNotified() != null) settings.setEmailNotified(request.emailNotified());
        if (request.emailUpdatesForWorkOrders() != null) settings.setEmailUpdatesForWorkOrders(request.emailUpdatesForWorkOrders());
        if (request.emailUpdatesForRequests() != null) settings.setEmailUpdatesForRequests(request.emailUpdatesForRequests());
        if (request.statsForAssignedWorkOrders() != null) settings.setStatsForAssignedWorkOrders(request.statsForAssignedWorkOrders());
        return toSettingsResponse(userSettingsRepository.save(settings));
    }

    @GetMapping("/work-orders-overview")
    public WorkOrdersOverviewResponse getWorkOrdersOverview() {
        Long userId = currentUser.userId();
        Long orgId = currentUser.organizationId();
        long created = workOrderRepository.countByCreatedByIdAndOrganizationId(userId, orgId);
        long completed = workOrderRepository.countByCreatedByIdAndOrganizationIdAndStatus(userId, orgId, WorkOrderStatus.COMPLETED);
        return new WorkOrdersOverviewResponse(created, completed);
    }

    /**
     * Panel de Inicio de la app movil -- igual que getMobileOverviewStats
     * del real: conteos por estado, mas vencen-hoy y alta-prioridad, con
     * la opcion de filtrar solo lo asignado al usuario actual.
     */
    /**
     * Copia fiel de GET /analytics/work-orders/mobile/complete-compliant real:
     * alimenta la pantalla de estadisticas del celular.
     *
     * "Cumplida" = se completo ANTES de su fecha de vencimiento. Una orden
     * sin fecha de vencimiento cuenta siempre como cumplida (no se le puede
     * exigir un plazo que nunca se definio).
     */
    @GetMapping("/mobile/complete-compliant")
    @org.springframework.transaction.annotation.Transactional(readOnly = true)
    public com.tuempresa.cmms.dto.response.MobileStatsExtendedResponse getMobileExtendedStats() {
        Instant inicioSemana = LocalDate.now().minusDays(7).atStartOfDay(ZoneId.systemDefault()).toInstant();
        List<WorkOrder> todas = workOrderRepository.findAll();

        List<WorkOrder> completadas = todas.stream()
                .filter(wo -> wo.getStatus() == WorkOrderStatus.COMPLETED)
                .toList();

        List<WorkOrder> cumplidas = completadas.stream()
                .filter(wo -> wo.getDueDate() == null
                        || (wo.getCompletedAt() != null && wo.getCompletedAt().isBefore(wo.getDueDate())))
                .toList();

        List<WorkOrder> completadasSemana = completadas.stream()
                .filter(wo -> wo.getCompletedAt() != null
                        && wo.getCompletedAt().isBefore(Instant.now())
                        && wo.getCompletedAt().isAfter(inicioSemana))
                .toList();

        List<WorkOrder> cumplidasSemana = cumplidas.stream()
                .filter(wo -> wo.getCompletedAt() == null || wo.getCompletedAt().isAfter(inicioSemana))
                .toList();

        return new com.tuempresa.cmms.dto.response.MobileStatsExtendedResponse(
                completadas.size(),
                completadasSemana.size(),
                todas.isEmpty() ? 1 : (double) cumplidas.size() / todas.size(),
                completadasSemana.isEmpty() ? 1 : (double) cumplidasSemana.size() / completadasSemana.size());
    }

    @GetMapping("/mobile-overview")
    @org.springframework.transaction.annotation.Transactional(readOnly = true)
    public MobileOverviewResponse getMobileOverview(@RequestParam(defaultValue = "false") boolean assignedOnly) {
        Long userId = currentUser.userId();
        List<WorkOrder> workOrders = workOrderRepository.findAll().stream()
                .filter(wo -> !assignedOnly || isAssignedToMe(wo, userId))
                .toList();

        Instant startOfToday = LocalDate.now().atStartOfDay(ZoneId.systemDefault()).toInstant();
        Instant startOfTomorrow = LocalDate.now().plusDays(1).atStartOfDay(ZoneId.systemDefault()).toInstant();

        int open = 0, onHold = 0, inProgress = 0, complete = 0, today = 0, high = 0;
        for (WorkOrder wo : workOrders) {
            switch (wo.getStatus()) {
                case OPEN -> open++;
                case ON_HOLD -> onHold++;
                case IN_PROGRESS -> inProgress++;
                case COMPLETED -> complete++;
            }
            if (wo.getDueDate() != null && !wo.getDueDate().isBefore(startOfToday) && wo.getDueDate().isBefore(startOfTomorrow)) {
                today++;
            }
            if (wo.getPriority() == com.tuempresa.cmms.model.enums.WorkOrderPriority.HIGH) {
                high++;
            }
        }
        return new MobileOverviewResponse(open, onHold, inProgress, complete, today, high);
    }

    private boolean isAssignedToMe(WorkOrder wo, Long userId) {
        boolean isPrimary = wo.getPrimaryAssignee() != null && userId.equals(wo.getPrimaryAssignee().getId());
        boolean isAdditional = wo.getAssignees() != null && wo.getAssignees().stream().anyMatch(u -> userId.equals(u.getId()));
        return isPrimary || isAdditional;
    }

    private User findMe() {
        return userRepository.findByIdWithRole(currentUser.userId())
                .orElseThrow(() -> new ResourceNotFoundException("Usuario no encontrado"));
    }

    private UserSettings findOrCreateSettings() {
        return userSettingsRepository.findByUserId(currentUser.userId())
                .orElseGet(() -> {
                    UserSettings settings = new UserSettings();
                    settings.setOrganizationId(currentUser.organizationId());
                    settings.setUser(findMe());
                    return userSettingsRepository.save(settings);
                });
    }

    private MyProfileResponse toProfileResponse(User u) {
        String avatarUrl = u.getAvatarStorageKey() != null
                ? fileStorageService.getDownloadUrl(u.getAvatarStorageKey())
                : null;
        com.tuempresa.cmms.model.entity.Role role = u.getRole();
        RoleResponse roleResponse = role != null
                ? new RoleResponse(role.getId(), role.getName(), role.getCode() != null ? role.getCode().name() : null, role.getDescription(),
                        userRepository.countByRoleId(role.getId()),
                        role.getCreatePermissions(), role.getViewPermissions(), role.getViewOtherPermissions(),
                        role.getEditOtherPermissions(), role.getDeleteOtherPermissions())
                : null;
        return new MyProfileResponse(
                u.getId(), u.getFirstName(), u.getLastName(), u.getEmail(),
                u.getPhone(), u.getJobTitle(), avatarUrl,
                Boolean.TRUE.equals(u.getMfaEnabled()), roleResponse);
    }

    private UserSettingsResponse toSettingsResponse(UserSettings s) {
        return new UserSettingsResponse(
                Boolean.TRUE.equals(s.getEmailNotified()),
                Boolean.TRUE.equals(s.getEmailUpdatesForWorkOrders()),
                Boolean.TRUE.equals(s.getEmailUpdatesForRequests()),
                Boolean.TRUE.equals(s.getStatsForAssignedWorkOrders()));
    }
}
