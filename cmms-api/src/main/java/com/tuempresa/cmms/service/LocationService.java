package com.tuempresa.cmms.service;

import com.tuempresa.cmms.dto.request.CreateFloorPlanRequest;
import com.tuempresa.cmms.dto.request.CreateLocationRequest;
import com.tuempresa.cmms.dto.response.*;
import com.tuempresa.cmms.exception.ResourceNotFoundException;
import com.tuempresa.cmms.model.entity.*;
import com.tuempresa.cmms.repository.*;
import com.tuempresa.cmms.security.CurrentUserProvider;
import org.springframework.data.domain.Page;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

/**
 * Igual que Location real de Atlas: jerarquia padre/hijo, equipos y
 * contratistas asociados, usuarios asignados (con notificacion de "nuevo
 * asignado" solo a los recien agregados), archivos y planos de piso.
 * Simplificacion honesta: sin "Customers" (no existe esa entidad en nuestra
 * app) y los planos de piso son solo nombre+area+imagen, sin el editor
 * visual de pines de activos sobre el plano que tiene el real.
 */
@Service
@RequiredArgsConstructor
public class LocationService {

    private final LocationRepository locationRepository;
    private final UserRepository userRepository;
    private final VendorRepository vendorRepository;
    private final com.tuempresa.cmms.repository.TeamRepository teamRepository;
    private final WorkOrderRepository workOrderRepository;
    private final AssetRepository assetRepository;
    private final WorkOrderService workOrderService;
    private final AssetService assetService;
    private final FloorPlanRepository floorPlanRepository;
    private final NotificationService notificationService;
    private final CurrentUserProvider currentUser;
    private final PermissionService permissionService;

    @Transactional
    public LocationResponse create(CreateLocationRequest request) {
        permissionService.requireCreate(com.tuempresa.cmms.model.enums.PermissionEntity.LOCATIONS);
        Location location = new Location();
        location.setOrganizationId(currentUser.organizationId());
        location.setCustomId("L" + String.format("%06d", locationRepository.count() + 1));
        applyFields(location, request);
        Location saved = locationRepository.save(location);
        notifyNewlyAssigned(saved, Set.of());
        return toResponse(saved);
    }

    @Transactional
    public LocationResponse update(Long id, CreateLocationRequest request) {
        Location location = findOrThrow(id);
        Set<Long> previousUserIds = location.getAssignedUsers().stream().map(User::getId).collect(Collectors.toSet());
        if (!permissionService.hasEditPermission(com.tuempresa.cmms.model.enums.PermissionEntity.LOCATIONS, null, previousUserIds)) {
            throw new com.tuempresa.cmms.exception.ForbiddenOperationException("No tienes permiso para editar esta ubicación.");
        }
        applyFields(location, request);
        Location saved = locationRepository.save(location);
        notifyNewlyAssigned(saved, previousUserIds);
        return toResponse(saved);
    }

    private void applyFields(Location location, CreateLocationRequest request) {
        location.setName(request.name());
        location.setAddress(request.address());
        location.setLatitude(request.latitude());
        location.setLongitude(request.longitude());
        location.setImageUrl(request.imageUrl());
        location.setParentLocation(request.parentLocationId() != null
                ? locationRepository.findById(request.parentLocationId()).orElse(null) : null);
        location.setAssignedUsers(request.assignedUserIds() != null && !request.assignedUserIds().isEmpty()
                ? new HashSet<>(userRepository.findAllById(request.assignedUserIds())) : new HashSet<>());
        location.setVendors(request.vendorIds() != null && !request.vendorIds().isEmpty()
                ? new HashSet<>(vendorRepository.findAllById(request.vendorIds())) : new HashSet<>());
        location.setTeams(request.teamIds() != null && !request.teamIds().isEmpty()
                ? new HashSet<>(teamRepository.findAllById(request.teamIds())) : new HashSet<>());
    }

    /** Igual que getNewUsersToNotify() real: solo avisa a los recien agregados. */
    private void notifyNewlyAssigned(Location location, Set<Long> previousUserIds) {
        location.getAssignedUsers().stream()
                .filter(u -> !previousUserIds.contains(u.getId()))
                .forEach(u -> notificationService.notifyUser(u, "LOCATION", "Nueva asignación",
                        "Fuiste asignado a la ubicación \"" + location.getName() + "\".", location.getId()));
    }

    @Transactional(readOnly = true)
    public LocationResponse getById(Long id) {
        return toResponse(findOrThrow(id));
    }

    @Transactional(readOnly = true)
    public List<LocationResponse> listAllForHierarchy() {
        return locationRepository.findAll().stream().map(this::toResponse).toList();
    }

    /** Igual que getChildrenById() real: id=0 son las ubicaciones raiz (sin padre), cualquier otro id trae sus hijos directos. */
    @Transactional(readOnly = true)
    public List<LocationResponse> getChildren(Long id) {
        List<Location> children = id == 0L
                ? locationRepository.findByParentLocationIsNull()
                : locationRepository.findByParentLocationId(id);
        return children.stream().map(this::toResponse).toList();
    }

    /** Igual proposito que exportEntity('locations') real. */
    @Transactional(readOnly = true)
    public String exportLocationsCsv() {
        StringBuilder sb = new StringBuilder("ID,Nombre,Direccion,Ubicacion padre,Creada\n");
        for (Location l : locationRepository.findAll()) {
            sb.append(l.getId()).append(',')
                    .append(csvEscape(l.getName())).append(',')
                    .append(csvEscape(l.getAddress())).append(',')
                    .append(csvEscape(l.getParentLocation() != null ? l.getParentLocation().getName() : "")).append(',')
                    .append(l.getCreatedAt()).append("\n");
        }
        return sb.toString();
    }

    private String csvEscape(String value) {
        if (value == null) return "";
        if (value.contains(",") || value.contains("\"") || value.contains("\n")) {
            return "\"" + value.replace("\"", "\"\"") + "\"";
        }
        return value;
    }

    /** Igual proposito que POST /locations/search real: paginado, con detalle completo. */
    @Transactional(readOnly = true)
    public Page<LocationResponse> search(String search, org.springframework.data.domain.Pageable pageable) {
        org.springframework.data.jpa.domain.Specification<Location> spec = (root, query, cb) ->
                (search == null || search.isBlank()) ? null : cb.like(cb.lower(root.get("name")), "%" + search.toLowerCase() + "%");
        return locationRepository.findAll(spec, pageable).map(this::toResponse);
    }

    @Transactional
    public void delete(Long id) {
        findOrThrow(id);
        if (!permissionService.hasDeletePermission(com.tuempresa.cmms.model.enums.PermissionEntity.LOCATIONS, null)) {
            throw new com.tuempresa.cmms.exception.ForbiddenOperationException("No tienes permiso para eliminar esta ubicación.");
        }
        locationRepository.deleteById(id);
    }

    @Transactional(readOnly = true)
    public List<AssetResponse> getAssets(Long locationId) {
        return assetRepository.findByLocationId(locationId).stream().map(assetService::toResponse).toList();
    }

    @Transactional(readOnly = true)
    public List<WorkOrderResponse> getWorkOrders(Long locationId) {
        return workOrderRepository.findByLocationId(locationId).stream().map(workOrderService::toResponse).toList();
    }

    @Transactional
    public FloorPlanResponse createFloorPlan(Long locationId, CreateFloorPlanRequest request) {
        Location location = findOrThrow(locationId);
        FloorPlan floorPlan = new FloorPlan();
        floorPlan.setOrganizationId(currentUser.organizationId());
        floorPlan.setLocation(location);
        floorPlan.setName(request.name());
        floorPlan.setArea(request.area());
        floorPlan.setImageUrl(request.imageUrl());
        FloorPlan saved = floorPlanRepository.save(floorPlan);
        return new FloorPlanResponse(saved.getId(), saved.getName(), saved.getArea(), saved.getImageUrl());
    }

    @Transactional(readOnly = true)
    public List<FloorPlanResponse> getFloorPlans(Long locationId) {
        return floorPlanRepository.findByLocationId(locationId).stream()
                .map(f -> new FloorPlanResponse(f.getId(), f.getName(), f.getArea(), f.getImageUrl()))
                .toList();
    }

    @Transactional
    public void deleteFloorPlan(Long floorPlanId) {
        floorPlanRepository.deleteById(floorPlanId);
    }

    private Location findOrThrow(Long id) {
        return locationRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Ubicación no encontrada: id=" + id));
    }

    /**
     * Copia fiel de GET /locations/children/{id}/paginated real: hijos
     * directos de una ubicacion, paginados. id = 0 devuelve la raiz.
     */
    @Transactional(readOnly = true)
    public com.tuempresa.cmms.dto.response.PageResponse<LocationResponse> findLocationChildren(
            Long id, int page, int size) {
        permissionService.requireView(com.tuempresa.cmms.model.enums.PermissionEntity.LOCATIONS);
        var pageable = org.springframework.data.domain.PageRequest.of(page, size);
        var pagina = (id == null || id == 0L)
                ? locationRepository.findByParentLocationIsNull(pageable)
                : locationRepository.findByParentLocationId(id, pageable);
        return com.tuempresa.cmms.dto.response.PageResponse.from(pagina.map(this::toResponse));
    }

    private LocationResponse toResponse(Location l) {
        return new LocationResponse(
                l.getId(), l.getCustomId(), l.getName(), l.getAddress(), l.getLatitude(), l.getLongitude(), l.getImageUrl(),
                l.getParentLocation() != null ? l.getParentLocation().getId() : null,
                l.getParentLocation() != null ? l.getParentLocation().getName() : null,
                l.getAssignedUsers().stream().map(u -> new LocationResponse.IdName(u.getId(), fullName(u))).toList(),
                l.getTeams().stream().map(t -> new LocationResponse.IdName(t.getId(), t.getName())).toList(),
                l.getVendors().stream().map(v -> new LocationResponse.IdName(v.getId(), v.getCompanyName())).toList(),
                l.getCreatedAt()
        );
    }

    private String fullName(User u) {
        String first = u.getFirstName() != null ? u.getFirstName() : "";
        String last = u.getLastName() != null ? u.getLastName() : "";
        return (first + " " + last).trim();
    }
}
