package com.tuempresa.cmms.controller;

import com.tuempresa.cmms.dto.request.*;
import com.tuempresa.cmms.dto.response.AuthResponse;
import com.tuempresa.cmms.service.AuthService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthService authService;

    @PostMapping("/login")
    public AuthResponse login(@Valid @RequestBody LoginRequest request, HttpServletRequest httpRequest) {
        return authService.login(request, clientIp(httpRequest), httpRequest.getHeader("User-Agent"));
    }

    /** Segundo paso del login cuando el usuario tiene MFA activado. */
    @PostMapping("/mfa/verify")
    public AuthResponse verifyMfa(@Valid @RequestBody MfaVerifyRequest request) {
        return authService.verifyMfaAndIssueTokens(request);
    }

    @PostMapping("/register")
    @ResponseStatus(HttpStatus.CREATED)
    public AuthResponse register(@Valid @RequestBody RegisterRequest request) {
        return authService.register(request);
    }

    @PostMapping("/verify-email")
    public void verifyEmail(@Valid @RequestBody VerifyEmailRequest request) {
        authService.verifyEmail(request);
    }

    @PostMapping("/forgot-password")
    public void forgotPassword(@Valid @RequestBody ForgotPasswordRequest request) {
        authService.forgotPassword(request);
    }

    @PostMapping("/reset-password")
    public void resetPassword(@Valid @RequestBody ResetPasswordRequest request) {
        authService.resetPassword(request);
    }

    @PostMapping("/refresh")
    public AuthResponse refresh(@Valid @RequestBody RefreshTokenRequest request) {
        return authService.refresh(request);
    }

    @PostMapping("/accept-invitation")
    @ResponseStatus(HttpStatus.CREATED)
    public AuthResponse acceptInvitation(@Valid @RequestBody AcceptInvitationRequest request) {
        return authService.acceptInvitation(request);
    }

    /** Igual que GET /auth/me real: quien soy, con el rol completo (y sus permisos) anidado. */
    @GetMapping("/me")
    public com.tuempresa.cmms.dto.response.MyProfileResponse whoami() {
        return authService.whoami();
    }

    /** Igual que POST /auth/updatepwd real. */
    @PostMapping("/updatepwd")
    public void updatePassword(@Valid @RequestBody ChangePasswordRequest request) {
        authService.updatePassword(request);
    }

    /** Igual que DELETE /auth real: elimina la cuenta propia. */
    @DeleteMapping
    public void deleteAccount() {
        authService.deleteAccount();
    }

    /** Respeta X-Forwarded-For si hay un proxy (Caddy) delante. */
    private String clientIp(HttpServletRequest request) {
        String forwarded = request.getHeader("X-Forwarded-For");
        if (forwarded != null && !forwarded.isBlank()) {
            return forwarded.split(",")[0].trim();
        }
        return request.getRemoteAddr();
    }
}
