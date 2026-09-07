package com.tuempresa.cmms.model.envers;

import com.tuempresa.cmms.model.entity.*;
import com.tuempresa.cmms.model.enums.WorkOrderPriority;
import com.tuempresa.cmms.model.enums.WorkOrderStatus;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.io.Serializable;
import java.time.Instant;

/**
 * Copia fiel de WorkOrderAud real: lee la tabla de auditoria que llena
 * Envers y arma un resumen legible de QUE cambio en cada revision, usando
 * las banderas "*_mod".
 */
@Entity
@Table(name = "work_orders_aud")
@Getter
@Setter
@NoArgsConstructor
public class WorkOrderAud implements Serializable {

    @EmbeddedId
    private WorkOrderAudId workOrderAudId;

    @Column(name = "revtype") // 0 = creacion, 1 = modificacion, 2 = eliminacion
    private Integer revtype;

    @Column(name = "title")
    private String title;

    @Column(name = "description", columnDefinition = "TEXT")
    private String description;

    @Enumerated(EnumType.STRING)
    @Column(name = "status")
    private WorkOrderStatus status;

    @Enumerated(EnumType.STRING)
    @Column(name = "priority")
    private WorkOrderPriority priority;

    @Column(name = "due_date")
    private Instant dueDate;

    @Column(name = "estimated_start_date")
    private Instant estimatedStartDate;

    @Column(name = "estimated_duration_minutes")
    private Integer estimatedDurationMinutes;

    @Column(name = "requires_signature")
    private Boolean requiresSignature;

    @Column(name = "feedback", columnDefinition = "TEXT")
    private String feedback;

    @Column(name = "archived")
    private Boolean archived;

    @Column(name = "completed_at")
    private Instant completedAt;

    @ManyToOne
    @JoinColumn(name = "category_id")
    private Category category;

    @ManyToOne
    @JoinColumn(name = "location_id")
    private Location location;

    @ManyToOne
    @JoinColumn(name = "asset_id")
    private Asset asset;

    @ManyToOne
    @JoinColumn(name = "team_id")
    private Team team;

    @ManyToOne
    @JoinColumn(name = "primary_assignee_id")
    private User primaryAssignee;

    @ManyToOne
    @JoinColumn(name = "completed_by_id")
    private User completedBy;

    // --- Banderas de campo modificado (Envers withModifiedFlag = true) ---
    @Column(name = "title_MOD") private Boolean titleMod;
    @Column(name = "description_MOD") private Boolean descriptionMod;
    @Column(name = "status_MOD") private Boolean statusMod;
    @Column(name = "priority_MOD") private Boolean priorityMod;
    @Column(name = "dueDate_MOD") private Boolean dueDateMod;
    @Column(name = "estimatedStartDate_MOD") private Boolean estimatedStartDateMod;
    @Column(name = "estimatedDurationMinutes_MOD") private Boolean estimatedDurationMod;
    @Column(name = "requiresSignature_MOD") private Boolean requiresSignatureMod;
    @Column(name = "feedback_MOD") private Boolean feedbackMod;
    @Column(name = "archived_MOD") private Boolean archivedMod;
    @Column(name = "completedAt_MOD") private Boolean completedAtMod;
    @Column(name = "category_MOD") private Boolean categoryMod;
    @Column(name = "location_MOD") private Boolean locationMod;
    @Column(name = "asset_MOD") private Boolean assetMod;
    @Column(name = "team_MOD") private Boolean teamMod;
    @Column(name = "primaryAssignee_MOD") private Boolean primaryAssigneeMod;
    @Column(name = "completedBy_MOD") private Boolean completedByMod;

    /**
     * Copia fiel de getSummary real: recorre las banderas y arma un texto
     * legible con TODOS los campos que cambiaron en esta revision.
     */
    public String getSummary() {
        StringBuilder resumen = new StringBuilder();
        String sep = ", ";
        String dosPuntos = ": ";

        if (Boolean.TRUE.equals(titleMod))
            resumen.append("Título").append(dosPuntos).append(title).append(sep);
        if (Boolean.TRUE.equals(descriptionMod))
            resumen.append("Descripción").append(sep);
        if (Boolean.TRUE.equals(statusMod))
            resumen.append("Estado").append(dosPuntos).append(etiquetaEstado(status)).append(sep);
        if (Boolean.TRUE.equals(priorityMod))
            resumen.append("Prioridad").append(dosPuntos).append(etiquetaPrioridad(priority)).append(sep);
        if (Boolean.TRUE.equals(dueDateMod))
            resumen.append("Fecha de vencimiento").append(dosPuntos).append(fecha(dueDate)).append(sep);
        if (Boolean.TRUE.equals(estimatedStartDateMod))
            resumen.append("Fecha de inicio prevista").append(dosPuntos).append(fecha(estimatedStartDate)).append(sep);
        if (Boolean.TRUE.equals(estimatedDurationMod))
            resumen.append("Duración estimada").append(dosPuntos).append(duracion(estimatedDurationMinutes)).append(sep);
        if (Boolean.TRUE.equals(requiresSignatureMod))
            resumen.append("Firma requerida").append(dosPuntos).append(booleano(requiresSignature)).append(sep);
        if (Boolean.TRUE.equals(feedbackMod))
            resumen.append("Retroalimentación").append(dosPuntos).append(feedback).append(sep);
        if (Boolean.TRUE.equals(archivedMod))
            resumen.append("Archivada").append(dosPuntos).append(booleano(archived)).append(sep);
        if (Boolean.TRUE.equals(completedAtMod))
            resumen.append("Completada el").append(dosPuntos).append(fecha(completedAt)).append(sep);
        if (Boolean.TRUE.equals(categoryMod))
            resumen.append("Categoría").append(dosPuntos).append(category == null ? "N/D" : category.getName()).append(sep);
        if (Boolean.TRUE.equals(locationMod))
            resumen.append("Ubicación").append(dosPuntos).append(location == null ? "N/D" : location.getName()).append(sep);
        if (Boolean.TRUE.equals(assetMod))
            resumen.append("Activo").append(dosPuntos).append(asset == null ? "N/D" : asset.getName()).append(sep);
        if (Boolean.TRUE.equals(teamMod))
            resumen.append("Equipo").append(dosPuntos).append(team == null ? "N/D" : team.getName()).append(sep);
        if (Boolean.TRUE.equals(primaryAssigneeMod))
            resumen.append("Trabajador principal").append(dosPuntos).append(nombre(primaryAssignee)).append(sep);
        if (Boolean.TRUE.equals(completedByMod))
            resumen.append("Completada por").append(dosPuntos).append(nombre(completedBy)).append(sep);

        return resumen.substring(0, Math.max(0, resumen.length() - sep.length()));
    }

    /** Mismas etiquetas en español que muestra la interfaz (constants.ts). */
    private String etiquetaEstado(WorkOrderStatus s) {
        if (s == null) return "N/D";
        return switch (s) {
            case OPEN -> "Abierta";
            case IN_PROGRESS -> "En progreso";
            case ON_HOLD -> "En espera";
            case COMPLETED -> "Completa";
        };
    }

    private String etiquetaPrioridad(WorkOrderPriority p) {
        if (p == null) return "N/D";
        return switch (p) {
            case NONE -> "Ninguna";
            case LOW -> "Baja";
            case MEDIUM -> "Media";
            case HIGH -> "Alta";
        };
    }

    /** Fecha legible en vez del formato tecnico (2026-07-31T06:37:02Z). */
    private String fecha(Instant instante) {
        if (instante == null) return "N/D";
        return java.time.format.DateTimeFormatter
                .ofPattern("dd/MM/yyyy HH:mm")
                .withZone(java.time.ZoneId.systemDefault())
                .format(instante);
    }

    private String duracion(Integer minutos) {
        if (minutos == null) return "N/D";
        int h = minutos / 60;
        int m = minutos % 60;
        return h > 0 ? h + "h " + m + "m" : m + "m";
    }

    private String booleano(Boolean valor) {
        return valor == null ? "" : (valor ? "Sí" : "No");
    }

    private String nombre(User u) {
        if (u == null) return "N/D";
        String n = (u.getFirstName() != null ? u.getFirstName() : "") + " "
                + (u.getLastName() != null ? u.getLastName() : "");
        return n.trim().isEmpty() ? "N/D" : n.trim();
    }
}
