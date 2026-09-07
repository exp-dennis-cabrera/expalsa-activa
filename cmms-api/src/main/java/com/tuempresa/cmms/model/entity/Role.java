package com.tuempresa.cmms.model.entity;

import com.tuempresa.cmms.model.enums.PermissionEntity;
import com.tuempresa.cmms.tenant.BaseTenantEntity;
import jakarta.persistence.CollectionTable;
import jakarta.persistence.Column;
import jakarta.persistence.ElementCollection;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.Setter;

import java.util.HashSet;
import java.util.Set;

/**
 * El modelo real (com.grash.model.Role) usa estas 5 colecciones en LAZY
 * (el default de JPA, sin especificar fetch), y le funciona porque su
 * proyecto tiene Open Session In View HABILITADO (el default de Spring
 * Boot que ellos nunca desactivan) -- la sesion de Hibernate permanece
 * abierta durante toda la solicitud HTTP, asi que las colecciones LAZY se
 * pueden serializar sin problema en cualquier controller.
 *
 * Nosotros tenemos "open-in-view: false" a proposito (mejor practica de
 * produccion, evita mantener conexiones a la base abiertas mas tiempo del
 * necesario). Intentamos compensar eso con @Transactional puntual en los
 * controllers que sirven un Role completo, pero en la practica seguimos
 * viendo el error LazyInitializationException en produccion de forma
 * intermitente/persistente. Ante la eleccion entre seguir persiguiendo un
 * problema de AOP/proxies dificil de diagnosticar a distancia, o una
 * solucion simple y 100% confiable, elegimos FetchType.EAGER: estas 5
 * colecciones son chicas (como mucho 15 permisos cada una), asi que el
 * costo real de cargarlas siempre es minimo. Es una desviacion deliberada
 * y documentada del real, no un descuido.
 *
 * - createPermissions: puede crear esa entidad
 * - viewPermissions: puede ver esa entidad (lo suyo/asignado)
 * - viewOtherPermissions: puede ver tambien lo de otros usuarios
 * - editOtherPermissions: puede editar lo de otros (lo propio siempre se puede editar)
 * - deleteOtherPermissions: puede eliminar lo de otros (lo propio siempre se puede eliminar)
 */
@Entity
@Table(name = "roles")
@Getter
@Setter
public class Role extends BaseTenantEntity {

    @Column(nullable = false)
    private String name; // ADMIN, TECHNICIAN, REQUESTER o custom

    @Column
    @Enumerated(EnumType.STRING)
    private com.tuempresa.cmms.model.enums.RoleCode code = com.tuempresa.cmms.model.enums.RoleCode.USER_CREATED;

    private String description;

    @ElementCollection(targetClass = PermissionEntity.class, fetch = FetchType.EAGER)
    @CollectionTable(name = "role_create_permissions", joinColumns = @JoinColumn(name = "role_id"))
    @Column(name = "permission")
    @Enumerated(EnumType.STRING)
    private Set<PermissionEntity> createPermissions = new HashSet<>();

    @ElementCollection(targetClass = PermissionEntity.class, fetch = FetchType.EAGER)
    @CollectionTable(name = "role_view_permissions", joinColumns = @JoinColumn(name = "role_id"))
    @Column(name = "permission")
    @Enumerated(EnumType.STRING)
    private Set<PermissionEntity> viewPermissions = new HashSet<>();

    @ElementCollection(targetClass = PermissionEntity.class, fetch = FetchType.EAGER)
    @CollectionTable(name = "role_view_other_permissions", joinColumns = @JoinColumn(name = "role_id"))
    @Column(name = "permission")
    @Enumerated(EnumType.STRING)
    private Set<PermissionEntity> viewOtherPermissions = new HashSet<>();

    @ElementCollection(targetClass = PermissionEntity.class, fetch = FetchType.EAGER)
    @CollectionTable(name = "role_edit_other_permissions", joinColumns = @JoinColumn(name = "role_id"))
    @Column(name = "permission")
    @Enumerated(EnumType.STRING)
    private Set<PermissionEntity> editOtherPermissions = new HashSet<>();

    @ElementCollection(targetClass = PermissionEntity.class, fetch = FetchType.EAGER)
    @CollectionTable(name = "role_delete_other_permissions", joinColumns = @JoinColumn(name = "role_id"))
    @Column(name = "permission")
    @Enumerated(EnumType.STRING)
    private Set<PermissionEntity> deleteOtherPermissions = new HashSet<>();
}
