package com.tuempresa.cmms.service;

import com.tuempresa.cmms.exception.ResourceNotFoundException;
import com.tuempresa.cmms.model.entity.ApiKey;
import com.tuempresa.cmms.model.entity.User;
import com.tuempresa.cmms.model.enums.PermissionEntity;
import com.tuempresa.cmms.repository.ApiKeyRepository;
import com.tuempresa.cmms.repository.UserRepository;
import com.tuempresa.cmms.security.CurrentUserProvider;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.util.Base64;
import java.util.List;

/**
 * Copia del ApiKeyService de Atlas CMMS (commit 44069b69).
 *
 * Genera llaves de 32 bytes al azar y guarda su SHA-256. El codigo en claro
 * se devuelve UNA sola vez, al crearla: despues ya no se puede recuperar.
 */
@Service
@RequiredArgsConstructor
public class ApiKeyService {

    private final ApiKeyRepository apiKeyRepository;
    private final UserRepository userRepository;
    private final CurrentUserProvider currentUser;
    private final PermissionService permissionService;

    /** Copia fiel de Helper.hashKey real: SHA-256 en Base64. */
    public static String hashKey(String raw) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hash = digest.digest(raw.getBytes(StandardCharsets.UTF_8));
            return Base64.getEncoder().encodeToString(hash);
        } catch (NoSuchAlgorithmException e) {
            throw new RuntimeException(e);
        }
    }

    /**
     * Crea una llave y devuelve el codigo EN CLARO junto a la entidad.
     * Es la unica vez que ese codigo existe fuera del hash.
     */
    @Transactional
    public java.util.Map.Entry<ApiKey, String> create(String label) {
        permissionService.requireView(PermissionEntity.SETTINGS);
        User user = userRepository.findById(currentUser.userId())
                .orElseThrow(() -> new ResourceNotFoundException("Usuario no encontrado"));

        ApiKey apiKey = new ApiKey();
        apiKey.setOrganizationId(currentUser.organizationId());
        apiKey.setLabel(label);
        apiKey.setUser(user);

        // Mismo esquema que el real: 32 bytes al azar en Base64 sin relleno.
        SecureRandom secureRandom = new SecureRandom();
        byte[] key = new byte[32];
        secureRandom.nextBytes(key);
        String code = Base64.getUrlEncoder().withoutPadding().encodeToString(key);
        apiKey.setCode(hashKey(code));

        return java.util.Map.entry(apiKeyRepository.save(apiKey), code);
    }

    @Transactional(readOnly = true)
    public List<ApiKey> getAll() {
        permissionService.requireView(PermissionEntity.SETTINGS);
        return apiKeyRepository.findAll();
    }

    @Transactional
    public void delete(Long id) {
        permissionService.requireView(PermissionEntity.SETTINGS);
        apiKeyRepository.deleteById(id);
    }
}
