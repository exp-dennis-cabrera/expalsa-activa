package com.tuempresa.cmms.controller;

import com.tuempresa.cmms.dto.request.CreateRoleRequest;
import com.tuempresa.cmms.dto.response.RoleResponse;
import com.tuempresa.cmms.exception.ForbiddenOperationException;
import com.tuempresa.cmms.exception.ResourceNotFoundException;
import com.tuempresa.cmms.model.entity.Role;
import com.tuempresa.cmms.model.enums.PermissionEntity;
import com.tuempresa.cmms.repository.RoleRepository;
import com.tuempresa.cmms.security.CurrentUserProvider;
import com.tuempresa.cmms.service.PermissionService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import java.util.HashSet;
import java.util.List;
import java.util.Set;

/**
 * Gestion de roles y sus permisos granulares (equivalente a RoleController
 * real). Mismo chequeo de acceso exacto que el real: puede gestionar roles
 * quien tenga viewPermissions de SETTINGS -- no es "ser ADMIN" a secas,
 * es tener ese permiso especifico (que ADMIN tiene por defecto, pero
 * tecnicamente cualquier rol con ese permiso podria).
 */
@RestController
@RequestMapping("/roles")
@RequiredArgsConstructor
@org.springframework.transaction.annotation.Transactional
public class RoleController {

    private final RoleRepository roleRepository;
    private final CurrentUserProvider currentUser;
    private final PermissionService permissionService;
    private final com.tuempresa.cmms.repository.UserRepository userRepository;

    @GetMapping
    public List<RoleResponse> list() {
        requireSettingsView();
        return roleRepository.findAll().stream().map(this::toResponse).toList();
    }

    @GetMapping("/{id}")
    public RoleResponse getById(@PathVariable Long id) {
        requireSettingsView();
        return toResponse(findOrThrow(id));
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public RoleResponse create(@Valid @RequestBody CreateRoleRequest request) {
        requireSettingsView();
        Role role = new Role();
        role.setOrganizationId(currentUser.organizationId());
        role.setName(request.name());
        role.setCode(com.tuempresa.cmms.model.enums.RoleCode.USER_CREATED);
        role.setDescription(request.description());
        applyPermissions(role, request.createPermissions(), request.viewPermissions(),
                request.viewOtherPermissions(), request.editOtherPermissions(), request.deleteOtherPermissions());
        return toResponse(roleRepository.save(role));
    }

    /** Igual que PATCH /roles/{id} real: actualiza nombre/descripcion y los 5 conjuntos de permisos juntos. */
    @PatchMapping("/{id}")
    public RoleResponse patch(@PathVariable Long id, @Valid @RequestBody CreateRoleRequest request) {
        requireSettingsView();
        Role role = findOrThrow(id);
        if (request.name() != null) role.setName(request.name());
        if (request.description() != null) role.setDescription(request.description());
        applyPermissions(role, request.createPermissions(), request.viewPermissions(),
                request.viewOtherPermissions(), request.editOtherPermissions(), request.deleteOtherPermissions());
        return toResponse(roleRepository.save(role));
    }

    @DeleteMapping("/{id}")
    public void delete(@PathVariable Long id) {
        requireSettingsView();
        Role role = findOrThrow(id);
        roleRepository.delete(role);
    }

    private Role findOrThrow(Long id) {
        return roleRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Rol no encontrado: id=" + id));
    }

    private void applyPermissions(Role role, Set<PermissionEntity> create, Set<PermissionEntity> view,
                                   Set<PermissionEntity> viewOther, Set<PermissionEntity> editOther, Set<PermissionEntity> deleteOther) {
        role.setCreatePermissions(create != null ? new HashSet<>(create) : new HashSet<>());
        role.setViewPermissions(view != null ? new HashSet<>(view) : new HashSet<>());
        role.setViewOtherPermissions(viewOther != null ? new HashSet<>(viewOther) : new HashSet<>());
        role.setEditOtherPermissions(editOther != null ? new HashSet<>(editOther) : new HashSet<>());
        role.setDeleteOtherPermissions(deleteOther != null ? new HashSet<>(deleteOther) : new HashSet<>());
    }

    /** Igual chequeo exacto que el real: viewPermissions.contains(SETTINGS), no "es ADMIN". */
    private void requireSettingsView() {
        if (!permissionService.hasViewPermission(PermissionEntity.SETTINGS)) {
            throw new ForbiddenOperationException("No tienes permiso para gestionar roles.");
        }
    }

    private RoleResponse toResponse(Role role) {
        return new RoleResponse(role.getId(), role.getName(), role.getCode() != null ? role.getCode().name() : null, role.getDescription(),
                userRepository.countByRoleId(role.getId()),
                role.getCreatePermissions(), role.getViewPermissions(), role.getViewOtherPermissions(),
                role.getEditOtherPermissions(), role.getDeleteOtherPermissions());
    }
}
