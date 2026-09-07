package com.tuempresa.cmms.controller;

import com.tuempresa.cmms.dto.request.MfaEnableRequest;
import com.tuempresa.cmms.dto.response.MfaSetupResponse;
import com.tuempresa.cmms.exception.ResourceNotFoundException;
import com.tuempresa.cmms.model.entity.User;
import com.tuempresa.cmms.repository.UserRepository;
import com.tuempresa.cmms.security.CurrentUserProvider;
import com.tuempresa.cmms.service.AuthService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * Configuracion de MFA para el usuario ya autenticado (desde Ajustes).
 * A diferencia de AuthController, estos endpoints SI requieren sesion
 * activa -- no estan bajo /auth/** (que es publico).
 */
@RestController
@RequestMapping("/mfa")
@RequiredArgsConstructor
public class MfaController {

    private final AuthService authService;
    private final UserRepository userRepository;
    private final CurrentUserProvider currentUser;

    @PostMapping("/setup")
    public MfaSetupResponse setup() {
        return authService.setupMfa(currentUserEntity());
    }

    @PostMapping("/enable")
    public void enable(@Valid @RequestBody MfaEnableRequest request) {
        authService.enableMfa(currentUserEntity(), request);
    }

    @PostMapping("/disable")
    public void disable() {
        authService.disableMfa(currentUserEntity());
    }

    private User currentUserEntity() {
        return userRepository.findById(currentUser.userId())
                .orElseThrow(() -> new ResourceNotFoundException("Usuario no encontrado"));
    }
}
