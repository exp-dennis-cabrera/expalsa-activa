package com.tuempresa.cmms.service;

import com.tuempresa.cmms.dto.request.CreateWorkOrderRequest;
import com.tuempresa.cmms.dto.request.UpdateWorkOrderRequest;
import com.tuempresa.cmms.dto.request.UpdateWorkOrderStatusRequest;
import com.tuempresa.cmms.dto.response.WorkOrderResponse;
import com.tuempresa.cmms.exception.ForbiddenOperationException;
import com.tuempresa.cmms.exception.ResourceNotFoundException;
import com.tuempresa.cmms.model.entity.Asset;
import com.tuempresa.cmms.model.entity.Category;
import com.tuempresa.cmms.model.entity.Location;
import com.tuempresa.cmms.model.entity.User;
import com.tuempresa.cmms.model.entity.Team;
import com.tuempresa.cmms.model.entity.Vendor;
import com.tuempresa.cmms.model.entity.WorkOrder;
import com.tuempresa.cmms.model.entity.WorkOrderStatusHistory;
import com.tuempresa.cmms.model.enums.WorkOrderPriority;
import com.tuempresa.cmms.model.enums.WorkOrderStatus;
import com.tuempresa.cmms.repository.AssetRepository;
import com.tuempresa.cmms.repository.CategoryRepository;
import com.tuempresa.cmms.repository.LocationRepository;
import com.tuempresa.cmms.repository.UserRepository;
import com.tuempresa.cmms.repository.TeamRepository;
import com.tuempresa.cmms.repository.WorkOrderStatusHistoryRepository;
import com.tuempresa.cmms.repository.VendorRepository;
import com.tuempresa.cmms.repository.WorkOrderRepository;
import com.tuempresa.cmms.security.CurrentUserProvider;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.HashSet;
import java.util.Set;
import java.util.stream.Collectors;

import static com.tuempresa.cmms.repository.spec.WorkOrderSpecifications.*;

@Service
@RequiredArgsConstructor
public class WorkOrderService {

    private final WorkOrderRepository workOrderRepository;
    private final AssetRepository assetRepository;
    private final LocationRepository locationRepository;
    private final CategoryRepository categoryRepository;
    private final VendorRepository vendorRepository;
    private final TeamRepository teamRepository;
    private final UserRepository userRepository;
    private final CurrentUserProvider currentUser;
    private final NotificationService notificationService;
    private final PermissionService permissionService;
    private final TaskService taskService;
    private final com.tuempresa.cmms.repository.WorkOrderAudRepository workOrderAudRepository;
    private final AssetStatusService assetStatusService;
    private final WorkOrderStatusHistoryRepository statusHistoryRepository;
    private final com.tuempresa.cmms.repository.FileAttachmentRepository fileAttachmentRepository;
    private final com.tuempresa.cmms.service.storage.FileStorageService fileStorageService;

    @Transactional
    public WorkOrderResponse create(CreateWorkOrderRequest request) {
        permissionService.requireCreate(com.tuempresa.cmms.model.enums.PermissionEntity.WORK_ORDERS);
        WorkOrder wo = new WorkOrder();
        wo.setOrganizationId(currentUser.organizationId());
        wo.setTitle(request.title());
        wo.setDescription(request.description());
        wo.setPriority(request.priority() != null ? request.priority() : WorkOrderPriority.NONE);
        if (request.type() != null) {
            wo.setType(request.type());
        }
        wo.setDueDate(request.dueDate());
        wo.setEstimatedStartDate(request.estimatedStartDate());
        wo.setEstimatedDurationMinutes(request.estimatedDurationMinutes());
        wo.setRequiresSignature(request.requiresSignature() != null && request.requiresSignature());
        wo.setStatus(WorkOrderStatus.OPEN);
        wo.setCustomId("WO" + String.format("%06d", workOrderRepository.nextCustomIdSequence()));

        if (request.categoryId() != null) {
            wo.setCategory(findCategoryOrThrow(request.categoryId()));
        }
        if (request.vendorId() != null) {
            wo.setVendor(findVendorOrThrow(request.vendorId()));
        }
        if (request.teamId() != null) {
            wo.setTeam(findTeamOrThrow(request.teamId()));
        }
        if (request.assetId() != null) {
            Asset asset = findAssetOrThrow(request.assetId());
            // "Estado del activo" del modal de Atlas: permite cambiar el estado
            // del Asset directamente desde la creacion/edicion de la orden.
            if (request.assetStatus() != null && !request.assetStatus().isBlank()) {
                com.tuempresa.cmms.model.enums.AssetStatus newStatus =
                        assetStatusService.parseOrDefault(request.assetStatus(), asset.getStatus());
                assetStatusService.changeStatus(asset, newStatus);
            }
            wo.setAsset(asset);
        }
        if (request.locationId() != null) {
            wo.setLocation(findLocationOrThrow(request.locationId()));
        }

        User creator = userRepository.findById(currentUser.userId())
                .orElseThrow(() -> new ResourceNotFoundException("Usuario no encontrado"));
        wo.setCreatedBy(creator);

        if (request.primaryAssigneeId() != null) {
            wo.setPrimaryAssignee(userRepository.findById(request.primaryAssigneeId())
                    .orElseThrow(() -> new ResourceNotFoundException("Trabajador principal no encontrado")));
        }
        wo.setAssignees(resolveAssignees(request.additionalAssigneeIds()));

        WorkOrder saved = workOrderRepository.save(wo);
        recordStatusHistory(saved, saved.getStatus());

        // Igual que el formulario real: la lista de verificacion se define
        // al crear la orden, no despues.
        if (request.taskLabels() != null) {
            request.taskLabels().stream()
                    .filter(label -> label != null && !label.isBlank())
                    .forEach(label -> taskService.createForWorkOrder(saved.getId(),
                            new com.tuempresa.cmms.dto.request.CreateTaskRequest(
                                    label.trim(), com.tuempresa.cmms.model.enums.TaskType.CHECKBOX)));
        }

        notificationService.notifyAdmins(
                "WORK_ORDER_CREATED",
                "Nueva orden de trabajo",
                "\"" + saved.getTitle() + "\" fue creada por " + fullName(creator) + ".",
                saved.getId());

        if (saved.getPrimaryAssignee() != null) {
            notificationService.notifyUser(
                    saved.getPrimaryAssignee(),
                    "WORK_ORDER_ASSIGNED",
                    "Te asignaron una orden de trabajo",
                    "\"" + saved.getTitle() + "\" fue asignada a ti.",
                    saved.getId());
        }
        if (saved.getTeam() != null) {
            saved.getTeam().getMembers().forEach(member ->
                    notificationService.notifyUser(
                            member,
                            "WORK_ORDER_ASSIGNED",
                            "Le asignaron una orden de trabajo a tu equipo",
                            "\"" + saved.getTitle() + "\" fue asignada a tu equipo (" + saved.getTeam().getName() + ").",
                            saved.getId()));
        }
        // Igual que getUsers() real de Atlas: primaryUser + team + assignedTo
        // son todos "involucrados" y reciben aviso.
        saved.getAssignees().forEach(assignee ->
                notificationService.notifyUser(
                        assignee,
                        "WORK_ORDER_ASSIGNED",
                        "Te asignaron una orden de trabajo",
                        "\"" + saved.getTitle() + "\" fue asignada a ti.",
                        saved.getId()));

        return toResponse(saved);
    }

    /**
     * Copia fiel de countUrgent real: ordenes que vencen dentro de los
     * proximos 2 dias y que todavia NO estan completadas. Es lo que
     * alimenta la insignia roja del menu lateral.
     */
    @Transactional(readOnly = true)
    public long countUrgent() {
        java.time.Instant limite = java.time.Instant.now().plus(2, java.time.temporal.ChronoUnit.DAYS);
        return workOrderRepository.findAll().stream()
                .filter(wo -> wo.getDueDate() != null && !wo.getDueDate().isAfter(limite))
                .filter(wo -> wo.getStatus() != WorkOrderStatus.COMPLETED)
                .filter(wo -> !Boolean.TRUE.equals(wo.getArchived()))
                .count();
    }

    /** Igual que GET /work-orders/asset/{id} real. */
    @Transactional(readOnly = true)
    public java.util.List<WorkOrderResponse> findByAsset(Long assetId) {
        return workOrderRepository.findByAssetId(assetId).stream().map(this::toResponse).toList();
    }

    /** Igual que GET /work-orders/location/{id} real. */
    @Transactional(readOnly = true)
    public java.util.List<WorkOrderResponse> findByLocation(Long locationId) {
        return workOrderRepository.findByLocationId(locationId).stream().map(this::toResponse).toList();
    }

    /**
     * Copia fiel de findByWorkOrder real: lee el historial que Hibernate
     * Envers genera automaticamente (tabla work_orders_aud), y arma el
     * resumen legible de cada revision con getSummary().
     *
     * revtype 1 = modificacion (0 seria la creacion, 2 la eliminacion).
     */
    @Transactional(readOnly = true)
    public java.util.List<com.tuempresa.cmms.dto.response.WorkOrderHistoryResponse> getHistory(Long workOrderId) {
        return workOrderAudRepository.findByIdAndRevtype(workOrderId, 1).stream()
                .map(aud -> {
                    var rev = aud.getWorkOrderAudId().getRev();
                    User autor = rev != null && rev.getUser() != null
                            ? userRepository.findById(rev.getUser().getId()).orElse(null)
                            : null;
                    return new com.tuempresa.cmms.dto.response.WorkOrderHistoryResponse(
                            (long) (rev != null ? rev.getId() : 0),
                            aud.getSummary(),
                            autor != null ? fullName(autor) : null,
                            rev != null ? java.time.Instant.ofEpochMilli(rev.getTimestamp()) : null);
                })
                .filter(r -> r.name() != null && !r.name().isBlank())
                .toList();
    }

    @Transactional(readOnly = true)
    public WorkOrderResponse getById(Long id) {
        WorkOrder wo = findOrThrow(id);
        // Misma regla que el listado: si no puede ver ordenes de otros,
        // solo accede a las que le competen -- aunque entre por ID directo.
        if (!permissionService.hasViewOtherPermission(com.tuempresa.cmms.model.enums.PermissionEntity.WORK_ORDERS)
                && !leCompete(wo)) {
            throw new com.tuempresa.cmms.exception.ForbiddenOperationException(
                    "Esta orden de trabajo no corresponde a tu área.");
        }
        return toResponse(wo);
    }

    /**
     * Guardian reutilizable: lanza si el usuario no puede operar sobre esa
     * orden. Igual que isAccessibleBy real, que los subrecursos (tiempos,
     * costos, archivos, comentarios, tareas...) invocan antes de tocar nada.
     *
     * Sin esto, un tecnico de otra subarea podia leer o modificar los
     * subrecursos de cualquier orden conociendo su id: el listado y el
     * detalle si validaban, pero las subsecciones no.
     */
    @Transactional(readOnly = true)
    public void requireAccess(Long workOrderId) {
        WorkOrder wo = findOrThrow(workOrderId);
        if (!permissionService.hasViewOtherPermission(com.tuempresa.cmms.model.enums.PermissionEntity.WORK_ORDERS)
                && !leCompete(wo)) {
            throw new com.tuempresa.cmms.exception.ForbiddenOperationException(
                    "Esta orden de trabajo no corresponde a tu área.");
        }
    }

    /** Las mismas 4 condiciones de visibleForUser, aplicadas a una orden concreta. */
    private boolean leCompete(WorkOrder wo) {
        Long userId = currentUser.userId();
        if (wo.getCreatedBy() != null && wo.getCreatedBy().getId().equals(userId)) return true;
        if (wo.getPrimaryAssignee() != null && wo.getPrimaryAssignee().getId().equals(userId)) return true;
        if (wo.getAssignees().stream().anyMatch(u -> u.getId().equals(userId))) return true;
        if (wo.getTeam() != null
                && teamRepository.findByMembers_Id(userId).stream()
                        .anyMatch(t -> t.getId().equals(wo.getTeam().getId()))) {
            return true;
        }
        // Igual que isAccessibleBy real: quien creo la SOLICITUD que dio
        // origen a esta orden tambien puede verla, aunque no sea de su area
        // -- necesita poder seguir que paso con lo que reporto.
        return wo.getParentRequest() != null
                && wo.getParentRequest().getCreatedBy() != null
                && wo.getParentRequest().getCreatedBy().getId().equals(userId);
    }

    /**
     * Igual que getSearchCriteria real: si el rol NO tiene "ver ordenes de
     * otros", se restringe el listado a lo que le compete al usuario --
     * lo suyo, lo que tiene asignado, y lo de SUS EQUIPOS (subareas).
     *
     * Si el rol si tiene ese permiso (por ejemplo el jefe de mantenimiento),
     * devuelve null y no se aplica ninguna restriccion.
     */
    private Specification<WorkOrder> restriccionPorVisibilidad() {
        if (permissionService.hasViewOtherPermission(com.tuempresa.cmms.model.enums.PermissionEntity.WORK_ORDERS)) {
            return null;
        }
        Long userId = currentUser.userId();
        java.util.List<Long> misEquipos = teamRepository.findByMembers_Id(userId).stream()
                .map(com.tuempresa.cmms.model.entity.Team::getId)
                .toList();
        return visibleForUser(userId, misEquipos);
    }

    /**
     * Copia fiel de findBySearchCriteria real: arma la consulta a partir de
     * los filtros que manda el navegador y devuelve la pagina pedida.
     *
     * Se conserva la restriccion por subarea (restriccionPorVisibilidad):
     * el usuario puede filtrar lo que quiera, pero nunca ve ordenes fuera
     * de su alcance.
     */
    /**
     * Exportacion de ordenes a CSV. Equivale a export_work_orders del menu
     * real (exportMenuItems, clave "work-orders").
     */
    @Transactional(readOnly = true)
    public String exportWorkOrdersCsv() {
        permissionService.requireView(com.tuempresa.cmms.model.enums.PermissionEntity.WORK_ORDERS);
        StringBuilder sb = new StringBuilder(
                "id,titulo,descripcion,estado,prioridad,activo,ubicacion,categoria,"
                + "responsable,completada_por,fecha_vencimiento,fecha_completada,fecha_creacion\n");
        for (WorkOrder wo : workOrderRepository.findAll(restriccionPorVisibilidad())) {
            sb.append(csv(wo.getCustomId())).append(',')
              .append(csv(wo.getTitle())).append(',')
              .append(csv(wo.getDescription())).append(',')
              .append(csv(wo.getStatus() != null ? wo.getStatus().name() : null)).append(',')
              .append(csv(wo.getPriority() != null ? wo.getPriority().name() : null)).append(',')
              .append(csv(wo.getAsset() != null ? wo.getAsset().getName() : null)).append(',')
              .append(csv(wo.getLocation() != null ? wo.getLocation().getName() : null)).append(',')
              .append(csv(wo.getCategory() != null ? wo.getCategory().getName() : null)).append(',')
              .append(csv(wo.getPrimaryAssignee() != null ? wo.getPrimaryAssignee().getFirstName() + " " + wo.getPrimaryAssignee().getLastName() : null)).append(',')
              .append(csv(wo.getCompletedBy() != null ? wo.getCompletedBy().getFirstName() + " " + wo.getCompletedBy().getLastName() : null)).append(',')
              .append(csv(wo.getDueDate())).append(',')
              .append(csv(wo.getCompletedAt())).append(',')
              .append(csv(wo.getCreatedAt())).append('\n');
        }
        return sb.toString();
    }

    /**
     * Costos y tiempos por orden. Equivale a export_cost_and_time del menu
     * real (clave "costs-times").
     */
    @Transactional(readOnly = true)
    public String exportCostsAndTimesCsv() {
        permissionService.requireView(com.tuempresa.cmms.model.enums.PermissionEntity.WORK_ORDERS);
        StringBuilder sb = new StringBuilder(
                "id,titulo,estado,duracion_estimada_min,duracion_real_min,fecha_completada\n");
        for (WorkOrder wo : workOrderRepository.findAll(restriccionPorVisibilidad())) {
            sb.append(csv(wo.getCustomId())).append(',')
              .append(csv(wo.getTitle())).append(',')
              .append(csv(wo.getStatus() != null ? wo.getStatus().name() : null)).append(',')
              .append(csv(wo.getEstimatedDurationMinutes())).append(',')
              .append(csv(wo.getActualDurationMinutes())).append(',')
              .append(csv(wo.getCompletedAt())).append('\n');
        }
        return sb.toString();
    }

    /** Escapa un valor para CSV: comillas dobles si tiene comas o saltos. */
    private String csv(Object valor) {
        if (valor == null) return "";
        String s = valor.toString();
        if (s.contains(",") || s.contains("\"") || s.contains("\n")) {
            return "\"" + s.replace("\"", "\"\"") + "\"";
        }
        return s;
    }

    @Transactional(readOnly = true)
    public Page<WorkOrderResponse> findBySearchCriteria(
            com.tuempresa.cmms.advancedsearch.SearchCriteria searchCriteria) {
        var builder = new com.tuempresa.cmms.advancedsearch.SpecificationBuilder<WorkOrder>();
        searchCriteria.getFilterFields().forEach(builder::with);

        Specification<WorkOrder> visibilidad = restriccionPorVisibilidad();
        if (visibilidad != null) builder.with(visibilidad);

        Pageable page = org.springframework.data.domain.PageRequest.of(
                searchCriteria.getPageNum(), searchCriteria.getPageSize(),
                searchCriteria.getDirection(), searchCriteria.getSortField());
        return workOrderRepository.findAll(builder.build(), page).map(this::toResponse);
    }

    @Transactional(readOnly = true)
    public Page<WorkOrderResponse> list(java.util.List<WorkOrderStatus> statuses, java.util.List<WorkOrderPriority> priorities,
                                         Long assetId, String search, Long assignedToUserId, Pageable pageable) {
        Specification<WorkOrder> spec = Specification
                .where(hasStatusIn(statuses))
                .and(hasPriorityIn(priorities))
                .and(hasAssetId(assetId))
                .and(titleContains(search))
                .and(assignedToUser(assignedToUserId))
                .and(notArchived())
                .and(restriccionPorVisibilidad());

        return workOrderRepository.findAll(spec, pageable).map(this::toResponse);
    }

    /** Igual conjunto de filtros que la pantalla de filtros avanzados real. */
    @Transactional(readOnly = true)
    public Page<WorkOrderResponse> advancedSearch(com.tuempresa.cmms.dto.request.WorkOrderAdvancedFilterRequest f, Pageable pageable) {
        Specification<WorkOrder> spec = Specification
                .where(hasStatusIn(f.status()))
                .and(hasPriorityIn(f.priority()))
                .and(titleContains(f.search()))
                .and(assignedToUser(f.assignedToUserId()))
                .and(hasAssetIdIn(f.assetIds()))
                .and(hasCategoryIdIn(f.categoryIds()))
                .and(hasTeamIdIn(f.teamIds()))
                .and(hasLocationIdIn(f.locationIds()))
                .and(hasPrimaryAssigneeIdIn(f.primaryUserIds()))
                .and(hasAssigneeIdIn(f.additionalWorkerIds()))
                .and(hasCreatedByIdIn(f.createdByIds()))
                .and(hasCompletedByIdIn(f.completedByIds()))
                .and(f.archived() != null && f.archived() ? isArchived(true) : notArchived())
                .and(dueDateBefore(f.dueDateBefore()))
                .and(createdAtBetween(f.createdAtFrom(), f.createdAtTo()))
                .and(updatedAtBetween(f.updatedAtFrom(), f.updatedAtTo()))
                .and(completedAtBetween(f.completedAtFrom(), f.completedAtTo()))
                .and(restriccionPorVisibilidad());

        return workOrderRepository.findAll(spec, pageable).map(this::toResponse);
    }

    @Transactional
    public WorkOrderResponse update(Long id, UpdateWorkOrderRequest request) {
        WorkOrder wo = findOrThrow(id);
        Long previousAssigneeId = wo.getPrimaryAssignee() != null ? wo.getPrimaryAssignee().getId() : null;
        java.util.Set<Long> previousUserIds = previousInvolvedUserIds(wo);
        if (!permissionService.hasEditPermission(com.tuempresa.cmms.model.enums.PermissionEntity.WORK_ORDERS,
                wo.getCreatedBy() != null ? wo.getCreatedBy().getId() : null, previousUserIds)) {
            throw new com.tuempresa.cmms.exception.ForbiddenOperationException("No tienes permiso para editar esta orden de trabajo.");
        }

        wo.setTitle(request.title());
        wo.setDescription(request.description());
        if (request.priority() != null) wo.setPriority(request.priority());
        if (request.type() != null) wo.setType(request.type());
        wo.setDueDate(request.dueDate());
        wo.setEstimatedStartDate(request.estimatedStartDate());
        wo.setEstimatedDurationMinutes(request.estimatedDurationMinutes());
        if (request.requiresSignature() != null) wo.setRequiresSignature(request.requiresSignature());

        wo.setCategory(request.categoryId() != null ? findCategoryOrThrow(request.categoryId()) : null);
        wo.setVendor(request.vendorId() != null ? findVendorOrThrow(request.vendorId()) : null);
        wo.setTeam(request.teamId() != null ? findTeamOrThrow(request.teamId()) : null);
        wo.setLocation(request.locationId() != null ? findLocationOrThrow(request.locationId()) : null);

        if (request.assetId() != null) {
            Asset asset = findAssetOrThrow(request.assetId());
            if (request.assetStatus() != null && !request.assetStatus().isBlank()) {
                com.tuempresa.cmms.model.enums.AssetStatus newStatus =
                        assetStatusService.parseOrDefault(request.assetStatus(), asset.getStatus());
                assetStatusService.changeStatus(asset, newStatus);
            }
            wo.setAsset(asset);
        } else {
            wo.setAsset(null);
        }

        if (request.primaryAssigneeId() != null) {
            wo.setPrimaryAssignee(userRepository.findById(request.primaryAssigneeId())
                    .orElseThrow(() -> new ResourceNotFoundException("Trabajador principal no encontrado")));
        } else {
            wo.setPrimaryAssignee(null);
        }
        if (request.additionalAssigneeIds() != null) {
            wo.setAssignees(resolveAssignees(request.additionalAssigneeIds()));
        }

        WorkOrder saved = workOrderRepository.save(wo);

        boolean reassigned = saved.getPrimaryAssignee() != null
                && !saved.getPrimaryAssignee().getId().equals(previousAssigneeId);
        if (reassigned) {
            notificationService.notifyUser(
                    saved.getPrimaryAssignee(),
                    "WORK_ORDER_ASSIGNED",
                    "Te asignaron una orden de trabajo",
                    "\"" + saved.getTitle() + "\" fue reasignada a ti.",
                    saved.getId());
        }
        // Igual que patchNotify/getNewUsersToNotify real de Atlas: avisa a
        // TODOS los involucrados nuevos (equipo, asignados adicionales), no
        // solo al reasignado como trabajador principal.
        involvedUsers(saved).stream()
                .filter(u -> !previousUserIds.contains(u.getId()))
                .filter(u -> saved.getPrimaryAssignee() == null || !u.getId().equals(saved.getPrimaryAssignee().getId()) || !reassigned)
                .forEach(u -> notificationService.notifyUser(
                        u, "WORK_ORDER_ASSIGNED", "Te asignaron una orden de trabajo",
                        "\"" + saved.getTitle() + "\" fue asignada a ti.", saved.getId()));

        return toResponse(saved);
    }

    /** Igual que WorkOrderBase.getUsers() real: trabajador principal + equipo + asignados adicionales. */
    private java.util.Set<User> involvedUsers(WorkOrder wo) {
        java.util.Set<User> users = new java.util.HashSet<>();
        if (wo.getPrimaryAssignee() != null) users.add(wo.getPrimaryAssignee());
        if (wo.getTeam() != null) users.addAll(wo.getTeam().getMembers());
        users.addAll(wo.getAssignees());
        return users;
    }

    private java.util.Set<Long> previousInvolvedUserIds(WorkOrder wo) {
        java.util.Set<Long> ids = new java.util.HashSet<>();
        involvedUsers(wo).forEach(u -> ids.add(u.getId()));
        return ids;
    }

    /**
     * Regla de permisos real de Atlas CMMS:
     * - Admin/Limited Admin/Technician/Limited Technician pueden avanzar el estado.
     * - Solo Admin/Limited Admin pueden reabrir (volver a OPEN) -- se considera
     *   una accion administrativa (reabrir/reasignar).
     * - Requester no puede cambiar el estado en absoluto.
     * Fuente: docs.atlas-cmms.com/.../work-order-permissions-and-notifications
     */
    @Transactional
    public WorkOrderResponse updateStatus(Long id, UpdateWorkOrderStatusRequest request) {
        WorkOrder wo = findOrThrow(id);
        if (!permissionService.hasEditPermission(com.tuempresa.cmms.model.enums.PermissionEntity.WORK_ORDERS,
                wo.getCreatedBy() != null ? wo.getCreatedBy().getId() : null, previousInvolvedUserIds(wo))) {
            throw new com.tuempresa.cmms.exception.ForbiddenOperationException("No tienes permiso para cambiar el estado de esta orden de trabajo.");
        }

        WorkOrderStatus previousStatus = wo.getStatus();
        wo.setStatus(request.status());
        if (wo.getFirstReactedAt() == null) {
            wo.setFirstReactedAt(Instant.now());
        }
        if (request.status() == WorkOrderStatus.COMPLETED) {
            // Igual que CompleteWOModal real: si la orden exige firma, no se
            // puede completar sin ella. Antes el interruptor "Firma requerida"
            // no obligaba a nada.
            if (Boolean.TRUE.equals(wo.getRequiresSignature())
                    && (request.signature() == null || request.signature().isBlank())
                    && (wo.getSignature() == null || wo.getSignature().isBlank())) {
                throw new com.tuempresa.cmms.exception.ForbiddenOperationException(
                        "Esta orden requiere firma para completarse.");
            }
            wo.setCompletedAt(Instant.now());
            wo.setCompletedBy(userRepository.findById(currentUser.userId()).orElse(null));
            if (request.feedback() != null) wo.setFeedback(request.feedback());
            if (request.signature() != null) wo.setSignature(request.signature());
        } else if (previousStatus == WorkOrderStatus.COMPLETED) {
            // Al REABRIR se limpian los datos de finalizacion, igual que el
            // original. Sin esto, una orden reabierta seguia mostrando fecha
            // y usuario de cierre anteriores.
            wo.setCompletedAt(null);
            wo.setCompletedBy(null);
            wo.setFeedback(null);
            wo.setSignature(null);
        }
        WorkOrder saved = workOrderRepository.save(wo);
        if (previousStatus != saved.getStatus()) {
            recordStatusHistory(saved, saved.getStatus());
        }

        // Al completar se indica QUIEN lo hizo, igual que
        // complete_work_order_content real: "La orden X ha sido completada
        // por Juan". Para los demas estados basta el cambio.
        String quienCambio = userRepository.findById(currentUser.userId())
                .map(this::fullName).orElse("un usuario");
        String statusMessage = request.status() == WorkOrderStatus.COMPLETED
                ? "\"" + saved.getTitle() + "\" ha sido completada por " + quienCambio + "."
                : "\"" + saved.getTitle() + "\" cambió de estado a " + request.status().getEtiqueta() + ".";
        if (saved.getCreatedBy() != null) {
            notificationService.notifyUser(saved.getCreatedBy(), "WORK_ORDER_STATUS_CHANGED",
                    "Actualización de orden de trabajo", statusMessage, saved.getId());
        }
        if (saved.getPrimaryAssignee() != null) {
            notificationService.notifyUser(saved.getPrimaryAssignee(), "WORK_ORDER_STATUS_CHANGED",
                    "Actualización de orden de trabajo", statusMessage, saved.getId());
        }

        return toResponse(saved);
    }

    /**
     * Igual regla real: el dueño siempre puede eliminar lo suyo; para
     * eliminar ordenes de otros, el rol necesita deleteOtherPermissions
     * (solo ADMIN lo tiene por defecto -- LIMITED_ADMIN, por ejemplo, NO).
     */
    @Transactional
    public void delete(Long id) {
        WorkOrder wo = findOrThrow(id);
        if (!permissionService.hasDeletePermission(com.tuempresa.cmms.model.enums.PermissionEntity.WORK_ORDERS,
                wo.getCreatedBy() != null ? wo.getCreatedBy().getId() : null)) {
            throw new com.tuempresa.cmms.exception.ForbiddenOperationException("No tienes permiso para eliminar esta orden de trabajo.");
        }
        workOrderRepository.delete(wo);
    }

    /**
     * "Archivar" oculta la orden del listado sin borrarla -- se puede
     * desarchivar despues, a diferencia de "Eliminar" que es irreversible.
     */
    @Transactional
    public void archive(Long id) {
        WorkOrder wo = findOrThrow(id);
        if (!permissionService.hasDeletePermission(com.tuempresa.cmms.model.enums.PermissionEntity.WORK_ORDERS,
                wo.getCreatedBy() != null ? wo.getCreatedBy().getId() : null)) {
            throw new com.tuempresa.cmms.exception.ForbiddenOperationException("No tienes permiso para archivar esta orden de trabajo.");
        }
        wo.setArchived(true);
        workOrderRepository.save(wo);
    }

    /**
     * "Copiar orden de trabajo": crea una nueva orden con los mismos datos
     * generales (titulo, descripcion, prioridad, categoria, activo,
     * ubicacion, duracion, contratista, equipo), pero sin arrastrar estado,
     * fechas, comentarios ni tiempo/costos ya registrados -- una orden
     * completamente nueva, igual que el "copy_wo" real de Atlas.
     */
    @Transactional
    public WorkOrderResponse copy(Long id) {
        permissionService.requireCreate(com.tuempresa.cmms.model.enums.PermissionEntity.WORK_ORDERS);
        // No basta el permiso general de crear: hay que poder VER la orden
        // que se esta copiando. Antes se podia copiar una ajena con su id.
        requireAccess(id);
        WorkOrder original = findOrThrow(id);

        WorkOrder copy = new WorkOrder();
        copy.setOrganizationId(currentUser.organizationId());
        copy.setTitle(original.getTitle() + " (copia)");
        copy.setDescription(original.getDescription());
        copy.setPriority(original.getPriority());
        copy.setType(original.getType());
        copy.setCategory(original.getCategory());
        copy.setAsset(original.getAsset());
        copy.setLocation(original.getLocation());
        copy.setVendor(original.getVendor());
        copy.setTeam(original.getTeam());
        copy.setPrimaryAssignee(original.getPrimaryAssignee());
        copy.setAssignees(new HashSet<>(original.getAssignees()));
        copy.setEstimatedDurationMinutes(original.getEstimatedDurationMinutes());
        copy.setRequiresSignature(original.getRequiresSignature());
        copy.setStatus(WorkOrderStatus.OPEN);

        User creator = userRepository.findById(currentUser.userId())
                .orElseThrow(() -> new ResourceNotFoundException("Usuario no encontrado"));
        copy.setCreatedBy(creator);
        // Identificador propio: la copia es una orden nueva, no un duplicado
        // sin numero.
        copy.setCustomId("WO" + String.format("%06d", workOrderRepository.nextCustomIdSequence()));

        WorkOrder saved = workOrderRepository.save(copy);
        // Mismo tratamiento que una orden creada a mano: historial inicial y
        // las tareas clonadas, como hace el "copy_wo" real.
        recordStatusHistory(saved, saved.getStatus());
        taskService.copyTasks(original.getId(), saved.getId());

        return toResponse(saved);
    }

    // ---- helpers ----

    private WorkOrder findOrThrow(Long id) {
        return workOrderRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Work order no encontrado: id=" + id));
    }

    private Asset findAssetOrThrow(Long id) {
        return assetRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Asset no encontrado: id=" + id));
    }

    private Location findLocationOrThrow(Long id) {
        return locationRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Location no encontrada: id=" + id));
    }

    private Team findTeamOrThrow(Long id) {
        return teamRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Equipo no encontrado: id=" + id));
    }

    private Vendor findVendorOrThrow(Long id) {
        return vendorRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Contratista no encontrado: id=" + id));
    }

    private Category findCategoryOrThrow(Long id) {
        return categoryRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Categoria no encontrada: id=" + id));
    }

    private Set<User> resolveAssignees(Set<Long> assigneeIds) {
        if (assigneeIds == null || assigneeIds.isEmpty()) {
            return new HashSet<>();
        }
        return new HashSet<>(userRepository.findAllById(assigneeIds));
    }

    /** Igual que workOrder.image del real: la primera foto adjunta, si hay alguna. */
    private String firstImageUrl(Long workOrderId) {
        return fileAttachmentRepository.findFirstByWorkOrderIdAndContentTypeStartingWithOrderByCreatedAtAsc(workOrderId, "image/")
                .map(f -> fileStorageService.getDownloadUrl(f.getStorageKey()))
                .orElse(null);
    }

    WorkOrderResponse toResponse(WorkOrder wo) {
        return new WorkOrderResponse(
                wo.getId(),
                wo.getCustomId(),
                wo.getTitle(),
                firstImageUrl(wo.getId()),
                wo.getDescription(),
                wo.getStatus(),
                wo.getPriority(),
                wo.getType(),
                wo.getCategory() != null ? wo.getCategory().getId() : null,
                wo.getCategory() != null ? wo.getCategory().getName() : null,
                wo.getAsset() != null ? wo.getAsset().getId() : null,
                wo.getAsset() != null ? wo.getAsset().getName() : null,
                wo.getLocation() != null ? wo.getLocation().getId() : null,
                wo.getLocation() != null ? wo.getLocation().getName() : null,
                wo.getLocation() != null ? wo.getLocation().getAddress() : null,
                wo.getCreatedBy() != null ? wo.getCreatedBy().getId() : null,
                wo.getCreatedBy() != null ? fullName(wo.getCreatedBy()) : null,
                wo.getCompletedBy() != null ? wo.getCompletedBy().getId() : null,
                wo.getCompletedBy() != null ? fullName(wo.getCompletedBy()) : null,
                wo.getVendor() != null ? wo.getVendor().getId() : null,
                wo.getVendor() != null ? wo.getVendor().getCompanyName() : null,
                wo.getTeam() != null ? wo.getTeam().getId() : null,
                wo.getTeam() != null ? wo.getTeam().getName() : null,
                wo.getPrimaryAssignee() != null ? wo.getPrimaryAssignee().getId() : null,
                wo.getPrimaryAssignee() != null ? fullName(wo.getPrimaryAssignee()) : null,
                wo.getAssignees().stream()
                        .map(u -> new WorkOrderResponse.AssigneeSummary(u.getId(), fullName(u)))
                        .collect(Collectors.toSet()),
                wo.getDueDate(),
                wo.getEstimatedStartDate(),
                wo.getEstimatedDurationMinutes(),
                wo.getRequiresSignature(),
                wo.getFeedback(),
                wo.getSignature(),
                wo.getCompletedAt(),
                wo.getArchived(),
                fileAttachmentRepository.countByWorkOrderId(wo.getId()),
                wo.getParentRequest() != null && wo.getParentRequest().getCreatedBy() != null
                        ? fullName(wo.getParentRequest().getCreatedBy()) : null,
                wo.getCreatedAt(),
                wo.getUpdatedAt()
        );
    }

    private String fullName(User u) {
        String first = u.getFirstName() != null ? u.getFirstName() : "";
        String last = u.getLastName() != null ? u.getLastName() : "";
        return (first + " " + last).trim();
    }

    /**
     * Registra un punto en el historial de estados -- nuestra version de lo
     * que el real logra con Hibernate Envers. Package-private a proposito:
     * PreventiveMaintenanceService, RequestService y AssetService (umbral de
     * medidor) generan ordenes directo (sin pasar por create()) y necesitan
     * llamarlo tambien para que esas ordenes tengan su registro inicial.
     */
    void recordStatusHistory(WorkOrder wo, WorkOrderStatus status) {
        WorkOrderStatusHistory history = new WorkOrderStatusHistory();
        history.setOrganizationId(wo.getOrganizationId());
        history.setWorkOrder(wo);
        history.setStatus(status);
        history.setChangedAt(Instant.now());
        // El generador automatico (@Scheduled) corre SIN usuario autenticado,
        // asi que currentUser.userId() lanzaria excepcion y dejaria la orden
        // sin historial ni notificaciones. Se consulta de forma segura.
        try {
            userRepository.findById(currentUser.userId()).ifPresent(history::setChangedBy);
        } catch (RuntimeException sinUsuario) {
            // Generacion automatica: el cambio queda sin autor, como corresponde.
        }
        statusHistoryRepository.save(history);
    }
}
