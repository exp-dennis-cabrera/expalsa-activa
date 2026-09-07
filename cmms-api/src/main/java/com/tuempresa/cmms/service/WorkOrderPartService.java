package com.tuempresa.cmms.service;

import com.tuempresa.cmms.dto.request.AddWorkOrderPartRequest;
import com.tuempresa.cmms.dto.response.WorkOrderPartResponse;
import com.tuempresa.cmms.exception.ForbiddenOperationException;
import com.tuempresa.cmms.exception.ResourceNotFoundException;
import com.tuempresa.cmms.model.entity.Part;
import com.tuempresa.cmms.model.entity.WorkOrder;
import com.tuempresa.cmms.model.entity.WorkOrderPart;
import com.tuempresa.cmms.model.enums.RoleCode;
import com.tuempresa.cmms.model.enums.RoleNames;
import com.tuempresa.cmms.repository.PartRepository;
import com.tuempresa.cmms.repository.WorkOrderPartRepository;
import com.tuempresa.cmms.repository.WorkOrderRepository;
import com.tuempresa.cmms.security.CurrentUserProvider;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Set;

/**
 * Uso de repuestos en un work order. Replica el comportamiento real de Atlas:
 * al agregar un repuesto se descuenta automaticamente su stock, y si no hay
 * suficiente cantidad disponible, se rechaza la operacion (el tecnico ve el
 * stock disponible directamente en el formulario, igual que en Atlas).
 */
@Service
@RequiredArgsConstructor
public class WorkOrderPartService {

    private static final Set<String> CAN_USE_PART = Set.of(
            RoleNames.ADMIN, RoleNames.LIMITED_ADMIN, RoleNames.TECHNICIAN, RoleNames.LIMITED_TECHNICIAN);

    private final WorkOrderPartRepository workOrderPartRepository;
    private final WorkOrderRepository workOrderRepository;
    private final PartRepository partRepository;
    private final com.tuempresa.cmms.repository.UserRepository userRepository;
    private final NotificationService notificationService;
    private final CurrentUserProvider currentUser;

    @Transactional
    public WorkOrderPartResponse addPart(Long workOrderId, AddWorkOrderPartRequest request) {
        requireRole(CAN_USE_PART, "agregar repuestos a la orden");

        WorkOrder wo = workOrderRepository.findById(workOrderId)
                .orElseThrow(() -> new ResourceNotFoundException("Work order no encontrado: id=" + workOrderId));
        Part part = partRepository.findById(request.partId())
                .orElseThrow(() -> new ResourceNotFoundException("Repuesto no encontrado: id=" + request.partId()));

        int available = part.getQuantity() != null ? part.getQuantity() : 0;
        if (available < request.quantityUsed()) {
            throw new ForbiddenOperationException(
                    "No hay suficiente stock de \"" + part.getName() + "\" (disponible: " + available + ")");
        }
        int remaining = available - request.quantityUsed();
        part.setQuantity(remaining);
        partRepository.save(part);

        // Igual que la alerta de stock bajo real de Atlas: si el remanente
        // cae por debajo del minimo configurado, avisa a los administradores.
        // Simplificacion: notificamos a Admins/LimitedAdmins en vez de a un
        // conjunto de "usuarios asignados al repuesto" (esa relacion no
        // existe todavia porque no hay una pagina de gestion de Repuestos).
        Integer minQuantity = part.getMinQuantity();
        if (minQuantity != null && remaining < minQuantity) {
            notifyLowStock(part, remaining, minQuantity);
        }

        WorkOrderPart wop = new WorkOrderPart();
        wop.setWorkOrder(wo);
        wop.setPart(part);
        wop.setQuantityUsed(request.quantityUsed());
        wop.setUnitCostSnapshot(part.getCost());

        return toResponse(workOrderPartRepository.save(wop));
    }

    private void notifyLowStock(Part part, int remaining, int minQuantity) {
        String message = "El repuesto \"" + part.getName() + "\" tiene stock bajo: " + remaining
                + " unidades (mínimo configurado: " + minQuantity + ").";
        java.util.Set<Long> notified = new java.util.HashSet<>();
        userRepository.findByRoleNameInAndOrganizationId(
                        List.of(RoleCode.ADMIN, RoleCode.LIMITED_ADMIN), part.getOrganizationId())
                .forEach(admin -> {
                    notificationService.notifyUser(admin, "PART", "Stock bajo", message, part.getId());
                    notified.add(admin.getId());
                });
        // Igual que part.getUsers() real de Atlas: tambien avisa a los
        // usuarios asignados directamente al repuesto (sin duplicar si ya
        // es admin y fue notificado arriba).
        part.getAssignedUsers().stream()
                .filter(u -> !notified.contains(u.getId()))
                .forEach(u -> notificationService.notifyUser(u, "PART", "Stock bajo", message, part.getId()));
    }

    @Transactional(readOnly = true)
    public List<WorkOrderPartResponse> list(Long workOrderId) {
        return workOrderPartRepository.findByWorkOrderId(workOrderId).stream().map(this::toResponse).toList();
    }

    /**
     * Al quitar un repuesto de la orden, se restaura el stock -- consistencia
     * con el "Automatic parts usage tracking" de Atlas en ambas direcciones.
     */
    @Transactional
    public void removePart(Long workOrderPartId) {
        requireRole(CAN_USE_PART, "quitar repuestos de la orden");

        WorkOrderPart wop = workOrderPartRepository.findById(workOrderPartId)
                .orElseThrow(() -> new ResourceNotFoundException("Uso de repuesto no encontrado: id=" + workOrderPartId));

        Part part = wop.getPart();
        int current = part.getQuantity() != null ? part.getQuantity() : 0;
        part.setQuantity(current + wop.getQuantityUsed());
        partRepository.save(part);

        workOrderPartRepository.delete(wop);
    }

    private void requireRole(Set<String> allowedRoles, String action) {
        String role = currentUser.get().getRoleName();
        boolean allowed = role != null && allowedRoles.stream().anyMatch(r -> r.equalsIgnoreCase(role));
        if (!allowed) {
            throw new ForbiddenOperationException("Tu rol (" + role + ") no tiene permiso para " + action + ".");
        }
    }

    private WorkOrderPartResponse toResponse(WorkOrderPart wop) {
        Double unitCost = wop.getUnitCostSnapshot();
        Double totalCost = unitCost != null ? unitCost * wop.getQuantityUsed() : null;
        return new WorkOrderPartResponse(
                wop.getId(), wop.getPart().getId(), wop.getPart().getName(), wop.getQuantityUsed(), unitCost, totalCost);
    }
}
