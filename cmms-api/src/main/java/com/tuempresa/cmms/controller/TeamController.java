package com.tuempresa.cmms.controller;

import com.tuempresa.cmms.dto.request.CreateTeamRequest;
import com.tuempresa.cmms.dto.request.UpdateTeamRequest;
import com.tuempresa.cmms.dto.response.LocationSummary;
import com.tuempresa.cmms.dto.response.PartSummary;
import com.tuempresa.cmms.dto.response.TeamMiniResponse;
import com.tuempresa.cmms.dto.response.TeamResponse;
import com.tuempresa.cmms.dto.response.UserSummary;
import com.tuempresa.cmms.exception.ForbiddenOperationException;
import com.tuempresa.cmms.exception.ResourceNotFoundException;
import com.tuempresa.cmms.model.entity.Asset;
import com.tuempresa.cmms.model.entity.Location;
import com.tuempresa.cmms.model.entity.Part;
import com.tuempresa.cmms.model.entity.Team;
import com.tuempresa.cmms.model.entity.User;
import com.tuempresa.cmms.model.enums.PermissionEntity;
import com.tuempresa.cmms.repository.AssetRepository;
import com.tuempresa.cmms.repository.LocationRepository;
import com.tuempresa.cmms.repository.PartRepository;
import com.tuempresa.cmms.repository.TeamRepository;
import com.tuempresa.cmms.repository.UserRepository;
import com.tuempresa.cmms.security.CurrentUserProvider;
import com.tuempresa.cmms.service.NotificationService;
import com.tuempresa.cmms.service.PermissionService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.http.HttpStatus;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.util.HashSet;
import java.util.List;
import java.util.Set;

/**
 * Equipos: agrupan personas Y son responsables de ciertos activos/ubicaciones --
 * mismo modelo que el Team.java real de Atlas (users, asset, locations).
 * Copia fiel del control de acceso real: crear necesita createPermissions,
 * editar/eliminar lo permite el dueño (createdBy) o editOther/deleteOther,
 * y ver necesita viewPermissions de PEOPLE_AND_TEAMS.
 */
@RestController
@RequestMapping("/teams")
@RequiredArgsConstructor
public class TeamController {

    private final TeamRepository teamRepository;
    private final UserRepository userRepository;
    private final AssetRepository assetRepository;
    private final LocationRepository locationRepository;
    private final PartRepository partRepository;
    private final NotificationService notificationService;
    private final CurrentUserProvider currentUser;
    private final PermissionService permissionService;

    /** Igual que POST /teams/search real: paginado, exige viewPermissions de PEOPLE_AND_TEAMS. */
    @PostMapping("/search")
    @Transactional(readOnly = true)
    public Page<TeamResponse> search(@RequestBody(required = false) TeamSearchRequest request) {
        permissionService.requireView(PermissionEntity.PEOPLE_AND_TEAMS);
        int page = request != null && request.page() != null ? request.page() : 0;
        int size = request != null && request.size() != null ? request.size() : 10;
        String search = request != null ? request.search() : null;
        Pageable pageable = PageRequest.of(page, size);
        Specification<Team> spec = (root, query, cb) -> search == null || search.isBlank()
                ? cb.conjunction()
                : cb.like(cb.lower(root.get("name")), "%" + search.toLowerCase() + "%");
        return teamRepository.findAll(spec, pageable).map(this::toResponse);
    }

    public record TeamSearchRequest(Integer page, Integer size, String search) {
    }

    /** Igual que GET /teams/mini real: selector liviano id+nombre+miembros. */
    @GetMapping("/mini")
    @Transactional(readOnly = true)
    public List<TeamMiniResponse> mini() {
        return teamRepository.findAll().stream()
                .map(t -> new TeamMiniResponse(t.getId(), t.getName(), toUserSummaries(t)))
                .toList();
    }

    /** Igual que GET /teams/{id} real: exige viewPermissions de PEOPLE_AND_TEAMS. */
    @GetMapping("/{id}")
    @Transactional(readOnly = true)
    public TeamResponse getById(@PathVariable Long id) {
        permissionService.requireView(PermissionEntity.PEOPLE_AND_TEAMS);
        return toResponse(findOrThrow(id));
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    @Transactional
    public TeamResponse create(@Valid @RequestBody CreateTeamRequest request) {
        permissionService.requireCreate(PermissionEntity.PEOPLE_AND_TEAMS);
        Team team = new Team();
        team.setOrganizationId(currentUser.organizationId());
        team.setCreatedBy(userRepository.findById(currentUser.userId()).orElse(null));
        applyCreateRequest(team, request);
        Team saved = teamRepository.save(team);
        notifyNewMembers(saved, Set.of());
        return toResponse(saved);
    }

    /**
     * Igual que PATCH /teams/{id} real: SOLO nombre, descripción y
     * miembros -- activos/ubicaciones no se pueden cambiar aca, solo se
     * definen al crear. Requiere ser el creador, o tener editOtherPermissions.
     */
    @PatchMapping("/{id}")
    @Transactional
    public TeamResponse update(@PathVariable Long id, @Valid @RequestBody UpdateTeamRequest request) {
        Team team = findOrThrow(id);
        Long ownerId = team.getCreatedBy() != null ? team.getCreatedBy().getId() : null;
        if (!permissionService.hasEditPermission(PermissionEntity.PEOPLE_AND_TEAMS, ownerId, Set.of())) {
            throw new ForbiddenOperationException("No tenés permiso para editar este equipo.");
        }
        Set<Long> previousMemberIds = team.getMembers().stream().map(User::getId).collect(java.util.stream.Collectors.toSet());
        if (request.name() != null) team.setName(request.name());
        if (request.description() != null) team.setDescription(request.description());
        if (request.userIds() != null) team.setMembers(resolveMembers(request.userIds()));
        Team saved = teamRepository.save(team);
        notifyNewMembers(saved, previousMemberIds);
        return toResponse(saved);
    }

    /** Igual que patchNotify real de Atlas: solo avisa a los miembros recien agregados. */
    private void notifyNewMembers(Team team, Set<Long> previousMemberIds) {
        team.getMembers().stream()
                .filter(u -> !previousMemberIds.contains(u.getId()))
                .forEach(u -> notificationService.notifyUser(u, "TEAM", "Nueva asignación",
                        "Fuiste agregado al equipo \"" + team.getName() + "\".", team.getId()));
    }

    /** Igual que DELETE /teams/{id} real: dueño, o deleteOtherPermissions. */
    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @Transactional
    public void delete(@PathVariable Long id) {
        Team team = findOrThrow(id);
        Long ownerId = team.getCreatedBy() != null ? team.getCreatedBy().getId() : null;
        if (!permissionService.hasDeletePermission(PermissionEntity.PEOPLE_AND_TEAMS, ownerId)) {
            throw new ForbiddenOperationException("No tenés permiso para eliminar este equipo.");
        }
        teamRepository.delete(team);
    }

    private Team findOrThrow(Long id) {
        return teamRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Equipo no encontrado: id=" + id));
    }

    private void applyCreateRequest(Team team, CreateTeamRequest request) {
        team.setName(request.name());
        team.setDescription(request.description());
        team.setMembers(resolveMembers(request.userIds()));
        team.setAssets(resolveAssets(request.assetIds()));
        team.setLocations(resolveLocations(request.locationIds()));
        team.setParts(resolveParts(request.partIds()));
    }

    private Set<User> resolveMembers(Set<Long> userIds) {
        if (userIds == null || userIds.isEmpty()) return new HashSet<>();
        return new HashSet<>(userRepository.findAllById(userIds));
    }

    private Set<Asset> resolveAssets(Set<Long> assetIds) {
        if (assetIds == null || assetIds.isEmpty()) return new HashSet<>();
        return new HashSet<>(assetRepository.findAllById(assetIds));
    }

    private Set<Location> resolveLocations(Set<Long> locationIds) {
        if (locationIds == null || locationIds.isEmpty()) return new HashSet<>();
        return new HashSet<>(locationRepository.findAllById(locationIds));
    }

    private Set<Part> resolveParts(Set<Long> partIds) {
        if (partIds == null || partIds.isEmpty()) return new HashSet<>();
        return new HashSet<>(partRepository.findAllById(partIds));
    }

    private List<UserSummary> toUserSummaries(Team team) {
        return team.getMembers().stream()
                .map(u -> new UserSummary(u.getId(), fullName(u), u.getEmail(),
                        u.getRole() != null ? u.getRole().getName() : null, u.getHourlyRate(),
                        u.getPhone(), u.getJobTitle(), u.getStatus() != null ? u.getStatus().name() : null))
                .toList();
    }

    private TeamResponse toResponse(Team team) {
        List<UserSummary> members = toUserSummaries(team);
        List<TeamResponse.AssetSummaryLite> assets = team.getAssets().stream()
                .map(a -> new TeamResponse.AssetSummaryLite(a.getId(), a.getName()))
                .toList();
        List<LocationSummary> locations = team.getLocations().stream()
                .map(l -> new LocationSummary(l.getId(), l.getName()))
                .toList();
        List<PartSummary> parts = team.getParts().stream()
                .map(p -> new PartSummary(p.getId(), p.getName(), p.getErpSku(), p.getQuantity(), p.getCost()))
                .toList();
        return new TeamResponse(team.getId(), team.getName(), team.getDescription(),
                team.getCreatedBy() != null ? team.getCreatedBy().getId() : null,
                members, assets, locations, parts);
    }

    private String fullName(User u) {
        String first = u.getFirstName() != null ? u.getFirstName() : "";
        String last = u.getLastName() != null ? u.getLastName() : "";
        return (first + " " + last).trim();
    }
}
