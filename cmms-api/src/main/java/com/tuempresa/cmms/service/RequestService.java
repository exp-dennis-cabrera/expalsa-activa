package com.tuempresa.cmms.service;

import com.tuempresa.cmms.dto.request.*;
import com.tuempresa.cmms.dto.response.RequestResponse;
import com.tuempresa.cmms.dto.response.WorkOrderResponse;
import com.tuempresa.cmms.exception.ForbiddenOperationException;
import com.tuempresa.cmms.exception.ResourceNotFoundException;
import com.tuempresa.cmms.model.entity.*;
import com.tuempresa.cmms.model.enums.RoleCode;
import com.tuempresa.cmms.model.enums.WorkOrderStatus;
import com.tuempresa.cmms.repository.*;
import com.tuempresa.cmms.security.CurrentUserProvider;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

/**
 * Replica el flujo real de RequestController+RequestService de Atlas:
 * Pendiente -> Aprobada (genera una WorkOrder vinculada, notifica al
 * solicitante + admins) o Cancelada (con motivo, notifica igual). El estado
 * se deriva (no se guarda como columna), igual que el original.
 * Simplificacion honesta: sin portal publico externo (reCAPTCHA + URL sin
 * login) ni motor de Workflows -- ambos son subsistemas aparte que no
 * existen en nuestra app.
 */
@Service
@RequiredArgsConstructor
public class RequestService {

    private final RequestRepository requestRepository;
    private final CategoryRepository categoryRepository;
    private final AssetRepository assetRepository;
    private final LocationRepository locationRepository;
    private final TeamRepository teamRepository;
    private final UserRepository userRepository;
    private final WorkOrderRepository workOrderRepository;
    private final WorkOrderService workOrderService;
    private final AssetStatusService assetStatusService;
    private final NotificationService notificationService;
    private final CurrentUserProvider currentUser;
    private final PermissionService permissionService;

    @Transactional
    public RequestResponse create(CreateRequestRequest request) {
        permissionService.requireCreate(com.tuempresa.cmms.model.enums.PermissionEntity.REQUESTS);
        Request r = new Request();
        r.setOrganizationId(currentUser.organizationId());
        r.setCustomId("R" + String.format("%06d", requestRepository.count() + 1));
        r.setTitle(request.title());
        r.setDescription(request.description());
        r.setPriority(request.priority() != null ? request.priority() : com.tuempresa.cmms.model.enums.WorkOrderPriority.NONE);
        r.setType(request.type());
        r.setCategory(request.categoryId() != null ? categoryRepository.findById(request.categoryId()).orElse(null) : null);
        r.setAsset(request.assetId() != null ? assetRepository.findById(request.assetId()).orElse(null) : null);
        r.setLocation(request.locationId() != null ? locationRepository.findById(request.locationId()).orElse(null) : null);
        r.setTeam(request.teamId() != null ? teamRepository.findById(request.teamId()).orElse(null) : null);
        r.setDueDate(request.dueDate());
        r.setEstimatedDurationMinutes(request.estimatedDurationMinutes());
        r.setEstimatedStartDate(request.estimatedStartDate());
        r.setContact(request.contact());
        r.setCreatedBy(userRepository.findById(currentUser.userId()).orElse(null));

        Request saved = requestRepository.save(r);
        notifyAdmins(saved, "Nueva solicitud: \"" + saved.getTitle() + "\" fue creada por " + fullName(saved.getCreatedBy()) + ".");
        return toResponse(saved);
    }

    @Transactional(readOnly = true)
    public List<RequestResponse> list() {
        boolean isRequester = userRepository.findById(currentUser.userId())
                .map(u -> u.getRole() != null && com.tuempresa.cmms.model.enums.RoleCode.REQUESTER.equals(u.getRole().getCode()))
                .orElse(false);
        var all = requestRepository.findAllOrderByCreatedAtDesc();
        var filtered = isRequester
                ? all.stream().filter(r -> r.getCreatedBy() != null && r.getCreatedBy().getId().equals(currentUser.userId())).toList()
                : all;
        return filtered.stream().map(this::toResponse).toList();
    }

    @Transactional(readOnly = true)
    public RequestResponse getById(Long id) {
        Request r = findOrThrow(id);
        boolean isRequester = userRepository.findById(currentUser.userId())
                .map(u -> u.getRole() != null && com.tuempresa.cmms.model.enums.RoleCode.REQUESTER.equals(u.getRole().getCode()))
                .orElse(false);
        if (isRequester && (r.getCreatedBy() == null || !r.getCreatedBy().getId().equals(currentUser.userId()))) {
            throw new com.tuempresa.cmms.exception.ForbiddenOperationException("No puedes ver esta solicitud.");
        }
        return toResponse(r);
    }

    @Transactional(readOnly = true)
    public long countPending() {
        return requestRepository.countPending();
    }

    @Transactional
    public RequestResponse update(Long id, CreateRequestRequest request) {
        Request r = findOrThrow(id);
        if (r.getWorkOrder() != null) {
            throw new ForbiddenOperationException("No se puede editar una solicitud ya aprobada.");
        }
        if (!permissionService.hasEditPermission(com.tuempresa.cmms.model.enums.PermissionEntity.REQUESTS,
                r.getCreatedBy() != null ? r.getCreatedBy().getId() : null, java.util.Set.of())) {
            throw new ForbiddenOperationException("No tienes permiso para editar esta solicitud.");
        }
        r.setTitle(request.title());
        r.setDescription(request.description());
        if (request.priority() != null) r.setPriority(request.priority());
        r.setType(request.type());
        r.setCategory(request.categoryId() != null ? categoryRepository.findById(request.categoryId()).orElse(null) : null);
        r.setAsset(request.assetId() != null ? assetRepository.findById(request.assetId()).orElse(null) : null);
        r.setLocation(request.locationId() != null ? locationRepository.findById(request.locationId()).orElse(null) : null);
        r.setTeam(request.teamId() != null ? teamRepository.findById(request.teamId()).orElse(null) : null);
        r.setDueDate(request.dueDate());
        r.setEstimatedDurationMinutes(request.estimatedDurationMinutes());
        r.setEstimatedStartDate(request.estimatedStartDate());
        r.setContact(request.contact());
        return toResponse(requestRepository.save(r));
    }

    /**
     * Aprobar: genera una WorkOrder a partir de los campos de la solicitud
     * (igual que createWorkOrderFromRequest real), la vincula, y opcionalmente
     * cambia el estado del activo asociado.
     */
    @Transactional
    public WorkOrderResponse approve(Long id, ApproveRequestRequest request) {
        requireAdminOrLimitedAdmin();
        Request r = findOrThrow(id);
        if (r.getWorkOrder() != null) {
            throw new ForbiddenOperationException("La solicitud ya fue aprobada.");
        }

        WorkOrder wo = new WorkOrder();
        wo.setOrganizationId(r.getOrganizationId());
        wo.setTitle(r.getTitle());
        wo.setDescription(r.getDescription());
        wo.setPriority(r.getPriority());
        wo.setType(r.getType() != null ? r.getType() : com.tuempresa.cmms.model.enums.WorkOrderType.CORRECTIVE);
        wo.setStatus(WorkOrderStatus.OPEN);
        wo.setCustomId("WO" + String.format("%06d", workOrderRepository.count() + 1));
        wo.setCategory(r.getCategory());
        wo.setAsset(r.getAsset());
        wo.setLocation(r.getLocation());
        wo.setTeam(r.getTeam());
        wo.setDueDate(r.getDueDate());
        wo.setEstimatedDurationMinutes(r.getEstimatedDurationMinutes());
        wo.setEstimatedStartDate(r.getEstimatedStartDate());
        wo.setCreatedBy(r.getCreatedBy());
        wo.setPrimaryAssignee(request.primaryAssigneeId() != null
                ? userRepository.findById(request.primaryAssigneeId()).orElse(null) : null);

        WorkOrder savedWo = workOrderRepository.save(wo);
        workOrderService.recordStatusHistory(savedWo, savedWo.getStatus());
        r.setWorkOrder(savedWo);
        requestRepository.save(r);

        // Igual que el resto de flujos de creacion de ordenes: avisa al
        // trabajador principal y al equipo asignado, no solo al solicitante.
        if (savedWo.getPrimaryAssignee() != null) {
            notificationService.notifyUser(savedWo.getPrimaryAssignee(), "WORK_ORDER_ASSIGNED",
                    "Te asignaron una orden de trabajo", "\"" + savedWo.getTitle() + "\" fue asignada a ti.", savedWo.getId());
        }
        if (savedWo.getTeam() != null) {
            savedWo.getTeam().getMembers().forEach(member ->
                    notificationService.notifyUser(member, "WORK_ORDER_ASSIGNED",
                            "Le asignaron una orden de trabajo a tu equipo",
                            "\"" + savedWo.getTitle() + "\" fue asignada a tu equipo.", savedWo.getId()));
        }

        if (r.getAsset() != null && request.assetStatus() != null) {
            assetStatusService.changeStatus(r.getAsset(), request.assetStatus());
        }

        if (r.getCreatedBy() != null) {
            notificationService.notifyUser(r.getCreatedBy(), "REQUEST_APPROVED", "Solicitud aprobada",
                    "Tu solicitud \"" + r.getTitle() + "\" fue aprobada y se convirtio en una orden de trabajo.", savedWo.getId());
        }
        return workOrderService.toResponse(savedWo);
    }

    @Transactional
    public RequestResponse cancel(Long id, CancelRequestRequest request) {
        requireAdminOrLimitedAdmin();
        Request r = findOrThrow(id);
        if (r.getWorkOrder() != null) {
            throw new ForbiddenOperationException("La solicitud ya fue aprobada, no se puede cancelar.");
        }
        r.setCancelled(true);
        r.setCancellationReason(request.reason());
        Request saved = requestRepository.save(r);

        if (r.getCreatedBy() != null) {
            notificationService.notifyUser(r.getCreatedBy(), "REQUEST_CANCELLED", "Solicitud rechazada",
                    "Tu solicitud \"" + r.getTitle() + "\" fue rechazada. Motivo: " + request.reason(), null);
        }
        return toResponse(saved);
    }

    @Transactional
    public void delete(Long id) {
        Request r = findOrThrow(id);
        if (!permissionService.hasDeletePermission(com.tuempresa.cmms.model.enums.PermissionEntity.REQUESTS,
                r.getCreatedBy() != null ? r.getCreatedBy().getId() : null)) {
            throw new ForbiddenOperationException("No tienes permiso para eliminar esta solicitud.");
        }
        requestRepository.deleteById(id);
    }

    private void notifyAdmins(Request r, String message) {
        userRepository.findByRoleNameInAndOrganizationId(
                        List.of(RoleCode.ADMIN, RoleCode.LIMITED_ADMIN), r.getOrganizationId())
                .forEach(admin -> notificationService.notifyUser(admin, "NEW_REQUEST", "Nueva solicitud", message, r.getId()));
    }

    /** Igual chequeo exacto que el real: viewPermissions incluye SETTINGS (lo tiene ADMIN), o el código de rol es LIMITED_ADMIN. */
    private void requireAdminOrLimitedAdmin() {
        boolean hasSettingsView = permissionService.hasViewPermission(com.tuempresa.cmms.model.enums.PermissionEntity.SETTINGS);
        String role = currentUser.get().getRoleName();
        boolean allowed = hasSettingsView || RoleCode.LIMITED_ADMIN.name().equalsIgnoreCase(role);
        if (!allowed) {
            throw new ForbiddenOperationException("Solo un administrador puede aprobar o rechazar solicitudes.");
        }
    }

    private Request findOrThrow(Long id) {
        return requestRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Solicitud no encontrada: id=" + id));
    }

    private String fullName(User u) {
        if (u == null) return "alguien";
        String first = u.getFirstName() != null ? u.getFirstName() : "";
        String last = u.getLastName() != null ? u.getLastName() : "";
        return (first + " " + last).trim();
    }

    private RequestResponse toResponse(Request r) {
        String status = r.getWorkOrder() != null ? "APPROVED" : Boolean.TRUE.equals(r.getCancelled()) ? "CANCELLED" : "PENDING";
        return new RequestResponse(
                r.getId(), r.getCustomId(), r.getTitle(), r.getDescription(), r.getPriority(), r.getType(),
                r.getCategory() != null ? r.getCategory().getId() : null,
                r.getCategory() != null ? r.getCategory().getName() : null,
                r.getAsset() != null ? r.getAsset().getId() : null,
                r.getAsset() != null ? r.getAsset().getName() : null,
                r.getLocation() != null ? r.getLocation().getId() : null,
                r.getLocation() != null ? r.getLocation().getName() : null,
                r.getTeam() != null ? r.getTeam().getId() : null,
                r.getTeam() != null ? r.getTeam().getName() : null,
                r.getDueDate(), r.getEstimatedDurationMinutes(), r.getEstimatedStartDate(),
                r.getCreatedBy() != null ? r.getCreatedBy().getId() : null,
                r.getCreatedBy() != null ? fullName(r.getCreatedBy()) : null,
                r.getContact(), status, r.getCancelled(), r.getCancellationReason(),
                r.getWorkOrder() != null ? r.getWorkOrder().getId() : null,
                r.getCreatedAt()
        );
    }
}
