package com.tuempresa.cmms.controller;

import com.tuempresa.cmms.service.ApiKeyService;
import jakarta.validation.constraints.NotBlank;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import java.time.Instant;
import java.util.List;

/**
 * Llaves de API para integraciones. Mismo alcance que ApiKeyController real.
 */
@RestController
@RequestMapping("/api-keys")
@RequiredArgsConstructor
public class ApiKeyController {

    private final ApiKeyService apiKeyService;

    public record ApiKeyResponse(Long id, String label, String userName, Instant lastUsed) {
    }

    /** Solo al crear se devuelve el codigo en claro. */
    public record CreatedApiKeyResponse(Long id, String label, String code) {
    }

    public record CreateApiKeyRequest(@NotBlank String label) {
    }

    @GetMapping
    public List<ApiKeyResponse> list() {
        return apiKeyService.getAll().stream()
                .map(k -> new ApiKeyResponse(
                        k.getId(), k.getLabel(),
                        k.getUser().getFirstName() + " " + k.getUser().getLastName(),
                        k.getLastUsed()))
                .toList();
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public CreatedApiKeyResponse create(@jakarta.validation.Valid @RequestBody CreateApiKeyRequest request) {
        var creada = apiKeyService.create(request.label());
        return new CreatedApiKeyResponse(
                creada.getKey().getId(), creada.getKey().getLabel(), creada.getValue());
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable Long id) {
        apiKeyService.delete(id);
    }
}
