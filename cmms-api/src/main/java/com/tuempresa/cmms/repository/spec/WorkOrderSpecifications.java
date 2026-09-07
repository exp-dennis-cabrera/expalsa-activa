package com.tuempresa.cmms.repository.spec;

import com.tuempresa.cmms.model.entity.WorkOrder;
import com.tuempresa.cmms.model.enums.WorkOrderPriority;
import com.tuempresa.cmms.model.enums.WorkOrderStatus;
import org.springframework.data.jpa.domain.Specification;

import java.util.Collection;

/**
 * Nota: el aislamiento por organizationId NO se hace aqui, ya lo garantiza
 * el Hibernate @Filter activado en TenantFilter para toda la request.
 * Estas Specifications solo agregan filtros de negocio opcionales.
 */
public class WorkOrderSpecifications {

    private WorkOrderSpecifications() {
    }

    public static Specification<WorkOrder> hasStatus(WorkOrderStatus status) {
        return (root, query, cb) -> status == null ? null : cb.equal(root.get("status"), status);
    }

    public static Specification<WorkOrder> hasStatusIn(Collection<WorkOrderStatus> statuses) {
        return (root, query, cb) -> (statuses == null || statuses.isEmpty()) ? null : root.get("status").in(statuses);
    }

    public static Specification<WorkOrder> hasPriority(WorkOrderPriority priority) {
        return (root, query, cb) -> priority == null ? null : cb.equal(root.get("priority"), priority);
    }

    public static Specification<WorkOrder> hasPriorityIn(Collection<WorkOrderPriority> priorities) {
        return (root, query, cb) -> (priorities == null || priorities.isEmpty()) ? null : root.get("priority").in(priorities);
    }

    public static Specification<WorkOrder> hasAssetId(Long assetId) {
        return (root, query, cb) -> assetId == null ? null : cb.equal(root.get("asset").get("id"), assetId);
    }

    public static Specification<WorkOrder> hasAssetIdIn(Collection<Long> ids) {
        return (root, query, cb) -> (ids == null || ids.isEmpty()) ? null : root.get("asset").get("id").in(ids);
    }

    public static Specification<WorkOrder> hasCategoryIdIn(Collection<Long> ids) {
        return (root, query, cb) -> (ids == null || ids.isEmpty()) ? null : root.get("category").get("id").in(ids);
    }

    public static Specification<WorkOrder> hasTeamIdIn(Collection<Long> ids) {
        return (root, query, cb) -> (ids == null || ids.isEmpty()) ? null : root.get("team").get("id").in(ids);
    }

    public static Specification<WorkOrder> hasLocationIdIn(Collection<Long> ids) {
        return (root, query, cb) -> (ids == null || ids.isEmpty()) ? null : root.get("location").get("id").in(ids);
    }

    public static Specification<WorkOrder> hasPrimaryAssigneeIdIn(Collection<Long> ids) {
        return (root, query, cb) -> (ids == null || ids.isEmpty()) ? null : root.get("primaryAssignee").get("id").in(ids);
    }

    /** Trabajadores adicionales (no el principal) -- igual que el filtro "assignedTo" del real. */
    public static Specification<WorkOrder> hasAssigneeIdIn(Collection<Long> ids) {
        return (root, query, cb) -> {
            if (ids == null || ids.isEmpty()) return null;
            query.distinct(true);
            return root.join("assignees", jakarta.persistence.criteria.JoinType.LEFT).get("id").in(ids);
        };
    }

    public static Specification<WorkOrder> hasCreatedByIdIn(Collection<Long> ids) {
        return (root, query, cb) -> (ids == null || ids.isEmpty()) ? null : root.get("createdBy").get("id").in(ids);
    }

    public static Specification<WorkOrder> hasCompletedByIdIn(Collection<Long> ids) {
        return (root, query, cb) -> (ids == null || ids.isEmpty()) ? null : root.get("completedBy").get("id").in(ids);
    }

    public static Specification<WorkOrder> isArchived(Boolean archived) {
        return (root, query, cb) -> archived == null ? null : cb.equal(root.get("archived"), archived);
    }

    public static Specification<WorkOrder> dueDateBefore(java.time.Instant date) {
        return (root, query, cb) -> date == null ? null : cb.lessThan(root.get("dueDate"), date);
    }

    public static Specification<WorkOrder> createdAtBetween(java.time.Instant from, java.time.Instant to) {
        return (root, query, cb) -> {
            if (from == null && to == null) return null;
            if (from != null && to != null) return cb.between(root.get("createdAt"), from, to);
            return from != null ? cb.greaterThanOrEqualTo(root.get("createdAt"), from) : cb.lessThanOrEqualTo(root.get("createdAt"), to);
        };
    }

    public static Specification<WorkOrder> updatedAtBetween(java.time.Instant from, java.time.Instant to) {
        return (root, query, cb) -> {
            if (from == null && to == null) return null;
            if (from != null && to != null) return cb.between(root.get("updatedAt"), from, to);
            return from != null ? cb.greaterThanOrEqualTo(root.get("updatedAt"), from) : cb.lessThanOrEqualTo(root.get("updatedAt"), to);
        };
    }

    public static Specification<WorkOrder> completedAtBetween(java.time.Instant from, java.time.Instant to) {
        return (root, query, cb) -> {
            if (from == null && to == null) return null;
            if (from != null && to != null) return cb.between(root.get("completedAt"), from, to);
            return from != null ? cb.greaterThanOrEqualTo(root.get("completedAt"), from) : cb.lessThanOrEqualTo(root.get("completedAt"), to);
        };
    }

    /** Igual que el filtro rapido "solo asignadas a mi" del real: coincide si es el asignado principal O esta en la lista de adicionales. */
    public static Specification<WorkOrder> assignedToUser(Long userId) {
        return (root, query, cb) -> {
            if (userId == null) return null;
            query.distinct(true);
            return cb.or(
                    cb.equal(root.get("primaryAssignee").get("id"), userId),
                    cb.equal(root.join("assignees", jakarta.persistence.criteria.JoinType.LEFT).get("id"), userId)
            );
        };
    }

    /**
     * Copia fiel del filtro de visibilidad real (getSearchCriteria): cuando
     * el rol NO tiene "ver ordenes de otros", solo se ven las ordenes donde
     * el usuario esta involucrado de alguna forma:
     *
     *   1. La creo el mismo
     *   2. Es el trabajador principal
     *   3. Esta como trabajador adicional
     *   4. La orden esta asignada a un EQUIPO del que es miembro
     *
     * La cuarta condicion es la que hace que cada subarea (Electrico,
     * Refrigeracion, Mecanico, Soldadores, Mantenimiento 4.0) vea solo lo
     * suyo: basta con asignar la orden al equipo correspondiente.
     *
     * Y para trabajos entre varias subareas, agregar a alguien como
     * trabajador adicional le da acceso a ESA orden puntual, sin abrirle
     * el resto de las ordenes de ese equipo.
     */
    public static Specification<WorkOrder> visibleForUser(Long userId, java.util.List<Long> teamIds) {
        return (root, query, cb) -> {
            if (userId == null) return null;
            query.distinct(true);
            java.util.List<jakarta.persistence.criteria.Predicate> condiciones = new java.util.ArrayList<>();
            condiciones.add(cb.equal(root.get("createdBy").get("id"), userId));
            condiciones.add(cb.equal(root.get("primaryAssignee").get("id"), userId));
            condiciones.add(cb.equal(
                    root.join("assignees", jakarta.persistence.criteria.JoinType.LEFT).get("id"), userId));
            if (teamIds != null && !teamIds.isEmpty()) {
                condiciones.add(root.get("team").get("id").in(teamIds));
            }
            return cb.or(condiciones.toArray(new jakarta.persistence.criteria.Predicate[0]));
        };
    }

    public static Specification<WorkOrder> titleContains(String search) {
        return (root, query, cb) -> (search == null || search.isBlank())
                ? null
                : cb.like(cb.lower(root.get("title")), "%" + search.toLowerCase() + "%");
    }

    /**
     * "Archivar" oculta la orden del listado sin borrarla -- distinto de
     * "Eliminar". Por defecto el listado excluye las archivadas.
     */
    public static Specification<WorkOrder> notArchived() {
        return (root, query, cb) -> cb.or(
                cb.isNull(root.get("archived")),
                cb.equal(root.get("archived"), false)
        );
    }
}
