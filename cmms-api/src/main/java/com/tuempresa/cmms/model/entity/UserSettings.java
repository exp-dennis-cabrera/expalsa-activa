package com.tuempresa.cmms.model.entity;

import com.tuempresa.cmms.tenant.BaseTenantEntity;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

@Entity
@Table(name = "user_settings")
@Getter
@Setter
public class UserSettings extends BaseTenantEntity {

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false, unique = true)
    private User user;

    private Boolean emailNotified = true;
    private Boolean emailUpdatesForWorkOrders = true;
    private Boolean emailUpdatesForRequests = true;
    // Preferencia de la app movil: filtrar el panel de Inicio solo por lo
    // asignado al usuario actual, igual que el real.
    private Boolean statsForAssignedWorkOrders = false;
}
