package com.tuempresa.cmms.service;

import com.tuempresa.cmms.dto.request.*;
import com.tuempresa.cmms.dto.response.AuthResponse;
import com.tuempresa.cmms.dto.response.MfaSetupResponse;
import com.tuempresa.cmms.exception.EmailAlreadyExistsException;
import com.tuempresa.cmms.exception.ForbiddenOperationException;
import com.tuempresa.cmms.exception.ResourceNotFoundException;
import com.tuempresa.cmms.model.entity.*;
import com.tuempresa.cmms.model.enums.UserStatus;
import com.tuempresa.cmms.repository.*;
import com.tuempresa.cmms.security.CmmsUserDetails;
import com.tuempresa.cmms.security.JwtTokenProvider;
import com.tuempresa.cmms.security.PasswordPolicy;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.security.SecureRandom;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Base64;

@Service
@RequiredArgsConstructor
@Slf4j
public class AuthService {

    // Bloqueo de cuenta (control ISO 27001 A.8.5): 5 intentos fallidos
    // seguidos bloquean la cuenta 15 minutos.
    private static final int MAX_FAILED_ATTEMPTS = 5;
    private static final int LOCKOUT_MINUTES = 15;

    private final AuthenticationManager authenticationManager;
    private final JwtTokenProvider jwtTokenProvider;
    private final OrganizationRepository organizationRepository;
    private final RoleRepository roleRepository;
    private final UserRepository userRepository;
    private final com.tuempresa.cmms.security.CurrentUserProvider currentUser;
    private final com.tuempresa.cmms.service.storage.FileStorageService fileStorageService;
    private final UserInvitationRepository invitationRepository;
    private final PasswordEncoder passwordEncoder;
    private final LoginAuditLogRepository loginAuditLogRepository;
    private final PasswordResetTokenRepository passwordResetTokenRepository;
    private final EmailVerificationTokenRepository emailVerificationTokenRepository;
    private final AuthMailService authMailService;
    private final MfaService mfaService;

    @Transactional
    public AuthResponse login(LoginRequest request, String ipAddress, String userAgent) {
        User user = userRepository.findByEmail(request.email()).orElse(null);

        if (user != null && user.getLockedUntil() != null && Instant.now().isBefore(user.getLockedUntil())) {
            recordAudit(request.email(), false, "ACCOUNT_LOCKED", ipAddress, userAgent, user);
            throw new ForbiddenOperationException(
                    "Cuenta bloqueada temporalmente por demasiados intentos fallidos. Probá de nuevo en unos minutos.");
        }

        try {
            var authentication = authenticationManager.authenticate(
                    new UsernamePasswordAuthenticationToken(request.email(), request.password())
            );

            if (user != null) {
                user.setFailedLoginAttempts(0);
                user.setLockedUntil(null);
                userRepository.save(user);
            }
            recordAudit(request.email(), true, null, ipAddress, userAgent, user);

            CmmsUserDetails userDetails = (CmmsUserDetails) authentication.getPrincipal();

            if (user != null && Boolean.TRUE.equals(user.getMfaEnabled())) {
                return AuthResponse.mfaChallenge(jwtTokenProvider.generateMfaChallengeToken(user.getId()));
            }

            return issueTokens(userDetails);
        } catch (AuthenticationException e) {
            if (user != null) {
                int attempts = (user.getFailedLoginAttempts() == null ? 0 : user.getFailedLoginAttempts()) + 1;
                user.setFailedLoginAttempts(attempts);
                if (attempts >= MAX_FAILED_ATTEMPTS) {
                    user.setLockedUntil(Instant.now().plus(LOCKOUT_MINUTES, ChronoUnit.MINUTES));
                }
                userRepository.save(user);
            }
            recordAudit(request.email(), false, user == null ? "UNKNOWN_EMAIL" : "BAD_CREDENTIALS", ipAddress, userAgent, user);
            throw e;
        }
    }

    /** Segundo paso del login cuando el usuario tiene MFA activado. */
    @Transactional
    public AuthResponse verifyMfaAndIssueTokens(MfaVerifyRequest request) {
        if (!jwtTokenProvider.isValid(request.challengeToken())
                || !"mfa_challenge".equals(jwtTokenProvider.getTokenType(request.challengeToken()))) {
            throw new ForbiddenOperationException("El desafío de MFA es inválido o expiró. Iniciá sesión de nuevo.");
        }
        Long userId = jwtTokenProvider.getUserId(request.challengeToken());
        User user = userRepository.findByIdWithRole(userId)
                .orElseThrow(() -> new ResourceNotFoundException("Usuario no encontrado."));

        if (!mfaService.verifyCode(user.getMfaSecret(), request.code())) {
            throw new ForbiddenOperationException("El código de verificación es incorrecto.");
        }

        return issueTokens(new CmmsUserDetails(user));
    }

    @Transactional
    public AuthResponse register(RegisterRequest request) {
        if (userRepository.findByEmail(request.email()).isPresent()) {
            throw new EmailAlreadyExistsException(request.email());
        }
        PasswordPolicy.validate(request.password());

        Organization organization = new Organization();
        organization.setName(request.organizationName());
        organization = organizationRepository.save(organization);

        // Igual que el registro real: se crean los 6 roles predefinidos
        // completos, no solo ADMIN (antes solo se creaba ADMIN, y los otros
        // 5 -- LIMITED_ADMIN, TECHNICIAN, LIMITED_TECHNICIAN, VIEW_ONLY,
        // REQUESTER -- nunca existian para una organizacion registrada de
        // verdad, solo aparecian en el sembrador de datos de desarrollo).
        Role adminRole = createDefaultRole(organization.getId(), com.tuempresa.cmms.model.enums.RoleCode.ADMIN);
        createDefaultRole(organization.getId(), com.tuempresa.cmms.model.enums.RoleCode.LIMITED_ADMIN);
        createDefaultRole(organization.getId(), com.tuempresa.cmms.model.enums.RoleCode.TECHNICIAN);
        createDefaultRole(organization.getId(), com.tuempresa.cmms.model.enums.RoleCode.LIMITED_TECHNICIAN);
        createDefaultRole(organization.getId(), com.tuempresa.cmms.model.enums.RoleCode.VIEW_ONLY);
        createDefaultRole(organization.getId(), com.tuempresa.cmms.model.enums.RoleCode.REQUESTER);

        User user = new User();
        user.setOrganizationId(organization.getId());
        user.setEmail(request.email());
        user.setPasswordHash(passwordEncoder.encode(request.password()));
        user.setFirstName(request.firstName());
        user.setLastName(request.lastName());
        user.setStatus(UserStatus.ACTIVE);
        user.setRole(adminRole);
        // Quien se auto-registra todavia no probo ser dueño del correo --
        // las invitaciones (accept-invitation) no pasan por aca porque ya
        // vienen vetadas por un Admin que eligio ese correo a proposito.
        user.setEmailVerified(false);
        user = userRepository.save(user);

        sendVerificationEmail(user);

        CmmsUserDetails userDetails = new CmmsUserDetails(user);
        return issueTokens(userDetails);
    }

    @Transactional
    public void verifyEmail(VerifyEmailRequest request) {
        EmailVerificationToken token = emailVerificationTokenRepository.findByToken(request.token())
                .orElseThrow(() -> new ForbiddenOperationException("El link de verificación es inválido."));
        if (!token.isUsable()) {
            throw new ForbiddenOperationException("El link de verificación expiró. Pedí uno nuevo.");
        }
        token.setUsedAt(Instant.now());
        emailVerificationTokenRepository.save(token);

        User user = token.getUser();
        user.setEmailVerified(true);
        userRepository.save(user);
    }

    private void sendVerificationEmail(User user) {
        EmailVerificationToken token = new EmailVerificationToken();
        token.setToken(generateSecureToken());
        token.setUser(user);
        token.setExpiresAt(Instant.now().plus(24, ChronoUnit.HOURS));
        emailVerificationTokenRepository.save(token);
        authMailService.sendVerificationEmail(user.getOrganizationId(), user.getEmail(), token.getToken());
    }

    /**
     * Por diseño, NO revela si el correo existe o no (evita que alguien
     * use este endpoint para averiguar que correos estan registrados).
     * Siempre responde igual, exista o no la cuenta.
     */
    @Transactional
    public void forgotPassword(ForgotPasswordRequest request) {
        userRepository.findByEmail(request.email()).ifPresent(user -> {
            PasswordResetToken token = new PasswordResetToken();
            token.setToken(generateSecureToken());
            token.setUser(user);
            token.setExpiresAt(Instant.now().plus(30, ChronoUnit.MINUTES));
            passwordResetTokenRepository.save(token);
            authMailService.sendPasswordResetEmail(user.getOrganizationId(), user.getEmail(), token.getToken());
        });
    }

    @Transactional
    public void resetPassword(ResetPasswordRequest request) {
        PasswordResetToken token = passwordResetTokenRepository.findByToken(request.token())
                .orElseThrow(() -> new ForbiddenOperationException("El link de recuperación es inválido."));
        if (!token.isUsable()) {
            throw new ForbiddenOperationException("El link de recuperación expiró o ya se usó. Pedí uno nuevo.");
        }
        PasswordPolicy.validate(request.newPassword());

        token.setUsedAt(Instant.now());
        passwordResetTokenRepository.save(token);

        User user = token.getUser();
        user.setPasswordHash(passwordEncoder.encode(request.newPassword()));
        user.setFailedLoginAttempts(0);
        user.setLockedUntil(null);
        userRepository.save(user);
    }

    @Transactional
    public AuthResponse acceptInvitation(AcceptInvitationRequest request) {
        UserInvitation invitation = invitationRepository.findByEmail(request.email())
                .orElseThrow(() -> new ResourceNotFoundException(
                        "No hay una invitacion pendiente para este email."));

        if (userRepository.findByEmail(request.email()).isPresent()) {
            throw new EmailAlreadyExistsException(request.email());
        }
        PasswordPolicy.validate(request.password());

        User user = new User();
        user.setOrganizationId(invitation.getOrganizationId());
        user.setEmail(invitation.getEmail());
        user.setPasswordHash(passwordEncoder.encode(request.password()));
        user.setFirstName(request.firstName());
        user.setLastName(request.lastName());
        user.setPhone(request.phone());
        user.setStatus(UserStatus.ACTIVE);
        user.setRole(invitation.getRole());
        // Ya vino vetado por un Admin que la invito a proposito -- no hace
        // falta verificacion de correo aparte.
        user.setEmailVerified(true);
        user = userRepository.save(user);

        invitationRepository.delete(invitation);

        CmmsUserDetails userDetails = new CmmsUserDetails(user);
        return issueTokens(userDetails);
    }

    public AuthResponse refresh(RefreshTokenRequest request) {
        String token = request.refreshToken();
        if (!jwtTokenProvider.isValid(token) || !"refresh".equals(jwtTokenProvider.getTokenType(token))) {
            throw new ForbiddenOperationException("El refresh token es invalido o expiro. Inicia sesion de nuevo.");
        }

        Long userId = jwtTokenProvider.getUserId(token);
        User user = userRepository.findByIdWithRole(userId)
                .orElseThrow(() -> new ForbiddenOperationException("Usuario no encontrado."));

        CmmsUserDetails userDetails = new CmmsUserDetails(user);
        return issueTokens(userDetails);
    }

    // ---- MFA: configuracion (requiere estar autenticado -- ver MfaController) ----

    public MfaSetupResponse setupMfa(User user) {
        String secret = mfaService.generateSecret();
        user.setMfaSecret(secret); // se guarda ya, pero mfaEnabled sigue false hasta confirmar el codigo
        userRepository.save(user);
        return new MfaSetupResponse(secret, mfaService.buildOtpAuthUri(user, secret));
    }

    public void enableMfa(User user, MfaEnableRequest request) {
        if (user.getMfaSecret() == null) {
            throw new ForbiddenOperationException("Primero pedí el código QR (/auth/mfa/setup).");
        }
        if (!mfaService.verifyCode(user.getMfaSecret(), request.code())) {
            throw new ForbiddenOperationException("El código no es correcto. Revisá tu app de autenticación.");
        }
        user.setMfaEnabled(true);
        userRepository.save(user);
    }

    public void disableMfa(User user) {
        user.setMfaEnabled(false);
        user.setMfaSecret(null);
        userRepository.save(user);
    }

    // ---- helpers ----

    private void recordAudit(String email, boolean success, String reason, String ip, String userAgent, User user) {
        LoginAuditLog entry = new LoginAuditLog();
        entry.setEmail(email);
        entry.setSuccess(success);
        entry.setFailureReason(reason);
        entry.setIpAddress(ip);
        entry.setUserAgent(userAgent);
        entry.setOccurredAt(Instant.now());
        if (user != null) {
            entry.setUserId(user.getId());
            entry.setOrganizationId(user.getOrganizationId());
        }
        loginAuditLogRepository.save(entry);
    }

    private Role createDefaultRole(Long organizationId, com.tuempresa.cmms.model.enums.RoleCode roleCode) {
        Role role = new Role();
        role.setOrganizationId(organizationId);
        role.setName(com.tuempresa.cmms.config.DefaultRolePermissions.displayName(roleCode));
        role.setCode(roleCode);
        role.setDescription(com.tuempresa.cmms.config.DefaultRolePermissions.defaultDescription(roleCode));
        com.tuempresa.cmms.config.DefaultRolePermissions.apply(role, roleCode);
        return roleRepository.save(role);
    }

    private String generateSecureToken() {
        byte[] bytes = new byte[32];
        new SecureRandom().nextBytes(bytes);
        return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
    }

    private AuthResponse issueTokens(CmmsUserDetails userDetails) {
        String accessToken = jwtTokenProvider.generateAccessToken(userDetails);
        String refreshToken = jwtTokenProvider.generateRefreshToken(userDetails);
        return new AuthResponse(accessToken, refreshToken);
    }

    /** Igual que GET /auth/me real: quien soy, con el rol completo anidado (incluidos sus permisos). */
    @Transactional(readOnly = true)
    public com.tuempresa.cmms.dto.response.MyProfileResponse whoami() {
        User u = userRepository.findByIdWithRole(currentUser.userId())
                .orElseThrow(() -> new ResourceNotFoundException("Usuario no encontrado"));
        String avatarUrl = u.getAvatarStorageKey() != null ? fileStorageService.getDownloadUrl(u.getAvatarStorageKey()) : null;
        Role role = u.getRole();
        com.tuempresa.cmms.dto.response.RoleResponse roleResponse = role != null
                ? new com.tuempresa.cmms.dto.response.RoleResponse(role.getId(), role.getName(), role.getCode() != null ? role.getCode().name() : null, role.getDescription(),
                        userRepository.countByRoleId(role.getId()),
                        role.getCreatePermissions(), role.getViewPermissions(), role.getViewOtherPermissions(),
                        role.getEditOtherPermissions(), role.getDeleteOtherPermissions())
                : null;
        return new com.tuempresa.cmms.dto.response.MyProfileResponse(
                u.getId(), u.getFirstName(), u.getLastName(), u.getEmail(), u.getPhone(), u.getJobTitle(),
                avatarUrl, Boolean.TRUE.equals(u.getMfaEnabled()), roleResponse);
    }

    /** Igual que POST /auth/updatepwd real. */
    @Transactional
    public void updatePassword(ChangePasswordRequest request) {
        User user = userRepository.findById(currentUser.userId())
                .orElseThrow(() -> new ResourceNotFoundException("Usuario no encontrado"));
        if (!passwordEncoder.matches(request.oldPassword(), user.getPasswordHash())) {
            throw new ForbiddenOperationException("La contraseña actual no es correcta.");
        }
        PasswordPolicy.validate(request.newPassword());
        user.setPasswordHash(passwordEncoder.encode(request.newPassword()));
        userRepository.save(user);
    }

    /** Igual que DELETE /auth real (elimina la propia cuenta). */
    @Transactional
    public void deleteAccount() {
        User user = userRepository.findById(currentUser.userId())
                .orElseThrow(() -> new ResourceNotFoundException("Usuario no encontrado"));
        try {
            userRepository.delete(user);
        } catch (org.springframework.dao.DataIntegrityViolationException e) {
            throw new ForbiddenOperationException(
                    "No se puede eliminar la cuenta: tiene datos asociados (órdenes creadas, comentarios, etc). " +
                    "Pídele a otro administrador que reasigne esos datos primero.");
        }
    }
}
