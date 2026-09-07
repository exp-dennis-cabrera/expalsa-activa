package com.tuempresa.cmms.controller;

import com.tuempresa.cmms.dto.request.InviteUsersRequest;
import com.tuempresa.cmms.dto.request.UpdateUserRequest;
import com.tuempresa.cmms.dto.request.UpdateUserRoleRequest;
import com.tuempresa.cmms.dto.response.InvitedUserResponse;
import com.tuempresa.cmms.dto.response.MyProfileResponse;
import com.tuempresa.cmms.dto.response.PendingInvitationResponse;
import com.tuempresa.cmms.dto.response.RoleResponse;
import com.tuempresa.cmms.dto.response.UserMiniResponse;
import com.tuempresa.cmms.dto.response.UserSummary;
import com.tuempresa.cmms.exception.EmailAlreadyExistsException;
import com.tuempresa.cmms.exception.ForbiddenOperationException;
import com.tuempresa.cmms.exception.ResourceNotFoundException;
import com.tuempresa.cmms.model.entity.Role;
import com.tuempresa.cmms.model.entity.User;
import com.tuempresa.cmms.model.entity.UserInvitation;
import com.tuempresa.cmms.model.enums.PermissionEntity;
import com.tuempresa.cmms.model.enums.RoleCode;
import com.tuempresa.cmms.model.enums.UserStatus;
import com.tuempresa.cmms.repository.OrganizationRepository;
import com.tuempresa.cmms.repository.RoleRepository;
import com.tuempresa.cmms.repository.UserInvitationRepository;
import com.tuempresa.cmms.repository.UserRepository;
import com.tuempresa.cmms.security.CurrentUserProvider;
import com.tuempresa.cmms.service.InvitationMailService;
import com.tuempresa.cmms.service.PermissionService;
import com.tuempresa.cmms.service.storage.FileStorageService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.web.bind.annotation.*;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.List;

/**
 * Copia fiel del control de acceso real: cada accion tiene su propio
 * chequeo de permiso especifico (crear = createPermissions, deshabilitar/
 * cambiar rol = editOtherPermissions, todos de PEOPLE_AND_TEAMS), no un
 * generico "solo ADMIN puede" como teniamos antes.
 */
@RestController
@RequestMapping("/users")
@RequiredArgsConstructor
@Slf4j
public class UserController {

    private final UserRepository userRepository;
    private final RoleRepository roleRepository;
    private final OrganizationRepository organizationRepository;
    private final UserInvitationRepository invitationRepository;
    private final CurrentUserProvider currentUser;
    private final PermissionService permissionService;
    private final FileStorageService fileStorageService;
    private final InvitationMailService mailService;

    @Value("${cors.allowed-origin}")
    private String frontendUrl;

    /** Igual que POST /users/search real: paginado, con filtro enabledOnly (true por defecto). */
    @PostMapping("/search")
    @org.springframework.transaction.annotation.Transactional(readOnly = true)
    public Page<UserSummary> search(@RequestBody(required = false) UserSearchRequest request) {
        permissionService.requireView(PermissionEntity.PEOPLE_AND_TEAMS);
        int page = request != null && request.page() != null ? request.page() : 0;
        int size = request != null && request.size() != null ? request.size() : 10;
        String search = request != null ? request.search() : null;
        boolean enabledOnly = request == null || request.enabledOnly() == null || request.enabledOnly();
        Pageable pageable = PageRequest.of(page, size);
        Specification<User> spec = Specification.where(
                enabledOnly ? (root, q, cb) -> cb.notEqual(root.get("status"), UserStatus.DISABLED) : null);
        if (search != null && !search.isBlank()) {
            String term = "%" + search.toLowerCase() + "%";
            spec = spec.and((root, q, cb) -> cb.or(
                    cb.like(cb.lower(root.get("firstName")), term),
                    cb.like(cb.lower(root.get("lastName")), term),
                    cb.like(cb.lower(root.get("email")), term)));
        }
        return userRepository.findAll(spec, pageable).map(this::toResponse);
    }

    public record UserSearchRequest(Integer page, Integer size, String search, Boolean enabledOnly) {
    }

    /**
     * Replica el flujo real de Atlas (UserService.invite()): NO se crea la
     * cuenta de usuario en este momento. Se crea una UserInvitation pendiente,
     * y la cuenta solo se crea cuando la persona invitada acepta y define su
     * propia contrasena (ver /auth/accept-invitation). Como no tenemos SMTP,
     * en vez de mandar el link por email lo devolvemos aqui para que el
     * Admin lo comparta manualmente -- la logica de negocio (creacion diferida)
     * es identica, solo cambia el canal de entrega del link.
     */
    @PostMapping("/invite")
    public List<InvitedUserResponse> invite(@Valid @RequestBody InviteUsersRequest request) {
        permissionService.requireCreate(PermissionEntity.PEOPLE_AND_TEAMS);
        Role role = roleRepository.findById(request.roleId())
                .orElseThrow(() -> new ResourceNotFoundException("Rol no encontrado: id=" + request.roleId()));

        User inviter = userRepository.findById(currentUser.userId()).orElse(null);
        String inviterName = inviter != null ? fullName(inviter) : "Un administrador";
        String organizationName = organizationRepository.findById(currentUser.organizationId())
                .map(com.tuempresa.cmms.model.entity.Organization::getName)
                .orElse("tu organización");

        return request.emails().stream().map(email -> {
            if (userRepository.findByEmail(email).isPresent()) {
                throw new EmailAlreadyExistsException(email);
            }
            invitationRepository.findByEmail(email).ifPresent(invitationRepository::delete);

            UserInvitation invitation = new UserInvitation();
            invitation.setOrganizationId(currentUser.organizationId());
            invitation.setEmail(email);
            invitation.setRole(role);
            invitationRepository.save(invitation);

            String acceptUrl = frontendUrl + "/accept-invite?email=" + email;
            // El envio del correo NO debe tumbar la invitacion. Es habitual
            // que un tecnico de planta no tenga correo real y se le asigne
            // uno interno (ej. juan.perez@expalsa.local): ese correo no
            // existe, el envio falla, pero la invitacion ya quedo guardada y
            // el enlace se devuelve igual para compartirlo a mano.
            try {
                mailService.sendInvitationEmail(currentUser.organizationId(), email, inviterName, organizationName, acceptUrl);
            } catch (Exception e) {
                log.warn("No se pudo enviar el correo de invitación a {}: {}. El enlace se devuelve para compartirlo manualmente.",
                        email, e.getMessage());
            }
            return new InvitedUserResponse(email, acceptUrl);
        }).toList();
    }

    /** Igual que GET /users/invitations/last-week real: exige viewPermissions de SETTINGS (no PEOPLE_AND_TEAMS). */
    @GetMapping("/invitations/last-week")
    @org.springframework.transaction.annotation.Transactional(readOnly = true)
    public List<PendingInvitationResponse> lastWeekInvitations() {
        permissionService.requireView(PermissionEntity.SETTINGS);
        return invitationRepository.findRecentSince(Instant.now().minus(7, ChronoUnit.DAYS)).stream()
                .map(i -> new PendingInvitationResponse(i.getId(), i.getEmail(), i.getRole().getId(), i.getRole().getName(), i.getCreatedAt()))
                .toList();
    }

    /** Igual que GET /users/mini real: solo "trabajadores" habilitados por defecto, salvo que se pida incluir Solicitantes. */
    @GetMapping("/mini")
    @org.springframework.transaction.annotation.Transactional(readOnly = true)
    public List<UserMiniResponse> mini(@RequestParam(required = false) Boolean withRequesters) {
        List<User> users = userRepository.findAllWithRole();
        return users.stream()
                .filter(u -> u.getStatus() == UserStatus.ACTIVE)
                .filter(u -> Boolean.TRUE.equals(withRequesters)
                        || u.getRole() == null || u.getRole().getCode() != RoleCode.REQUESTER)
                .map(u -> new UserMiniResponse(u.getId(), fullName(u), u.getEmail()))
                .toList();
    }

    /** Igual que GET /users/mini/disabled real: solo los deshabilitados. */
    @GetMapping("/mini/disabled")
    @org.springframework.transaction.annotation.Transactional(readOnly = true)
    public List<UserMiniResponse> miniDisabled() {
        return userRepository.findAllWithRole().stream()
                .filter(u -> u.getStatus() == UserStatus.DISABLED)
                .map(u -> new UserMiniResponse(u.getId(), fullName(u), u.getEmail()))
                .toList();
    }

    /** Igual que PATCH /users/{id} real: cualquiera puede editar su propio perfil (SIN cambiar rol); para editar el de otro, editOtherPermissions. */
    // Mismo motivo que patchRole: la respuesta incluye los permisos del rol.
    @org.springframework.transaction.annotation.Transactional
    @PatchMapping("/{id:\\d+}")
    public MyProfileResponse update(@PathVariable Long id, @Valid @RequestBody UpdateUserRequest request) {
        boolean isSelf = id.equals(currentUser.userId());
        if (!isSelf && !editOtherPeopleAndTeamsPermission()) {
            throw new ForbiddenOperationException("No tienes permiso para editar este usuario.");
        }
        User user = userRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Usuario no encontrado: id=" + id));

        if (request.firstName() != null) user.setFirstName(request.firstName());
        if (request.lastName() != null) user.setLastName(request.lastName());
        if (request.phone() != null) user.setPhone(request.phone());
        if (request.jobTitle() != null) user.setJobTitle(request.jobTitle());
        if (request.hourlyRate() != null) user.setHourlyRate(request.hourlyRate());
        return toProfileResponse(userRepository.save(user));
    }

    @GetMapping("/{id:\\d+}")
    @org.springframework.transaction.annotation.Transactional(readOnly = true)
    public MyProfileResponse getById(@PathVariable Long id) {
        User user = userRepository.findByIdWithRole(id)
                .filter(u -> u.getOrganizationId().equals(currentUser.organizationId()))
                .orElseThrow(() -> new ResourceNotFoundException("Usuario no encontrado: id=" + id));
        return toProfileResponse(user);
    }

    /** Igual que PATCH /users/{id}/role real: endpoint separado, exige editOtherPermissions (nadie se auto-asigna un rol). */
    // @Transactional obligatorio: toProfileResponse lee las colecciones de
    // permisos del rol, que son perezosas. Con open-in-view desactivado, la
    // sesion se cierra al salir del metodo y leerlas despues falla con
    // "could not initialize proxy - no Session".
    @org.springframework.transaction.annotation.Transactional
    @PatchMapping("/{id}/role")
    public MyProfileResponse patchRole(@PathVariable Long id, @Valid @RequestBody UpdateUserRoleRequest request) {
        if (!editOtherPeopleAndTeamsPermission()) {
            throw new ForbiddenOperationException("No tienes permiso para cambiar el rol de este usuario.");
        }
        User user = userRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Usuario no encontrado: id=" + id));
        Role role = roleRepository.findById(request.roleId())
                .orElseThrow(() -> new ResourceNotFoundException("Rol no encontrado: id=" + request.roleId()));
        user.setRole(role);
        return toProfileResponse(userRepository.save(user));
    }

    /** Igual que PATCH /users/{id}/disable real: exige editOtherPermissions (nadie se deshabilita a si mismo). */
    @PatchMapping("/{id}/disable")
    public UserSummary disable(@PathVariable Long id) {
        if (!editOtherPeopleAndTeamsPermission()) {
            throw new ForbiddenOperationException("No tienes permiso para deshabilitar este usuario.");
        }
        return setStatus(id, UserStatus.DISABLED);
    }

    /** Igual que PATCH /users/{id}/enable real: exige editOtherPermissions. */
    @PatchMapping("/{id}/enable")
    public UserSummary enable(@PathVariable Long id) {
        if (!editOtherPeopleAndTeamsPermission()) {
            throw new ForbiddenOperationException("No tienes permiso para habilitar este usuario.");
        }
        return setStatus(id, UserStatus.ACTIVE);
    }

    /**
     * Igual que PATCH /users/soft-delete/{id} real: dueño (uno mismo) o
     * viewPermissions de SETTINGS. Deshabilita Y libera el correo
     * (agregando "_id" al final), para que ese correo se pueda volver a
     * usar en una cuenta nueva sin perder el historial de la vieja.
     */
    @PatchMapping("/soft-delete/{id}")
    public UserSummary softDelete(@PathVariable Long id) {
        boolean isSelf = id.equals(currentUser.userId());
        if (!isSelf && !permissionService.hasViewPermission(PermissionEntity.SETTINGS)) {
            throw new ForbiddenOperationException("No tienes permiso para eliminar este usuario.");
        }
        User user = userRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Usuario no encontrado: id=" + id));
        user.setStatus(UserStatus.DISABLED);
        user.setEmail(user.getEmail() + "_" + id);
        return toResponse(userRepository.save(user));
    }

    private UserSummary setStatus(Long id, UserStatus status) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Usuario no encontrado: id=" + id));
        user.setStatus(status);
        return toResponse(userRepository.save(user));
    }

    private boolean editOtherPeopleAndTeamsPermission() {
        return permissionService.hasEditPermission(PermissionEntity.PEOPLE_AND_TEAMS, null, java.util.Set.of());
    }

    private UserSummary toResponse(User u) {
        return new UserSummary(
                u.getId(), fullName(u), u.getEmail(),
                u.getRole() != null ? u.getRole().getName() : null, u.getHourlyRate(),
                u.getPhone(), u.getJobTitle(), u.getStatus() != null ? u.getStatus().name() : null);
    }

    private MyProfileResponse toProfileResponse(User u) {
        String avatarUrl = u.getAvatarStorageKey() != null ? fileStorageService.getDownloadUrl(u.getAvatarStorageKey()) : null;
        Role role = u.getRole();
        RoleResponse roleResponse = role != null
                ? new RoleResponse(role.getId(), role.getName(), role.getCode() != null ? role.getCode().name() : null, role.getDescription(),
                        userRepository.countByRoleId(role.getId()),
                        role.getCreatePermissions(), role.getViewPermissions(), role.getViewOtherPermissions(),
                        role.getEditOtherPermissions(), role.getDeleteOtherPermissions())
                : null;
        return new MyProfileResponse(
                u.getId(), u.getFirstName(), u.getLastName(), u.getEmail(), u.getPhone(), u.getJobTitle(),
                avatarUrl, Boolean.TRUE.equals(u.getMfaEnabled()), roleResponse);
    }

    private String fullName(User u) {
        String first = u.getFirstName() != null ? u.getFirstName() : "";
        String last = u.getLastName() != null ? u.getLastName() : "";
        return (first + " " + last).trim();
    }
}
