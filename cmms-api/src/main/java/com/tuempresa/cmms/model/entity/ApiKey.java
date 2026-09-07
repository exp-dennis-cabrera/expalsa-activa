package com.tuempresa.cmms.model.entity;

import com.tuempresa.cmms.tenant.BaseTenantEntity;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.time.Instant;

/**
 * Copia fiel de model/ApiKey.java de Atlas CMMS (commit 44069b69).
 *
 * Llave de acceso para sistemas externos (por ejemplo, el ERP). A diferencia
 * del token de sesion, no caduca a los 30 minutos: se revoca borrandola.
 *
 * El codigo se guarda CIFRADO (SHA-256), nunca en texto plano. Se muestra
 * una sola vez al crearla; si se pierde, hay que generar otra.
 */
@Entity
@Table(name = "api_keys")
@Getter
@Setter
public class ApiKey extends BaseTenantEntity {

    /** Nombre para identificarla: "ERP - lectura de existencias". */
    @Column(nullable = false)
    private String label;

    /** SHA-256 del codigo. Nunca el codigo en si. */
    @Column(nullable = false, unique = true)
    private String code;

    /** El usuario cuyos permisos hereda la llave. */
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    /** Ultima vez que se uso. Sirve para detectar llaves olvidadas. */
    private Instant lastUsed;
}
