package com.tuempresa.cmms.model.entity;

import com.tuempresa.cmms.tenant.BaseTenantEntity;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

/**
 * Copia fiel de PushNotificationToken real: guarda el token del dispositivo
 * movil de cada usuario, para poder mandarle notificaciones push aunque no
 * tenga la app abierta. Uno por usuario -- al guardar uno nuevo, se
 * reemplaza el anterior.
 */
@Entity
@Table(name = "push_notification_tokens")
@Getter
@Setter
public class PushNotificationToken extends BaseTenantEntity {

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false, unique = true)
    private User user;

    @Column(nullable = false, length = 512)
    private String token;
}
