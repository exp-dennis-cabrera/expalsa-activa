package com.tuempresa.cmms.repository;

import com.tuempresa.cmms.model.entity.ApiKey;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface ApiKeyRepository extends JpaRepository<ApiKey, Long> {
    /** Busca por el hash del codigo, no por el codigo en si. */
    Optional<ApiKey> findByCode(String code);
}
