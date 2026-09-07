package com.tuempresa.cmms.service;

import com.tuempresa.cmms.dto.request.CreateAdditionalCostRequest;
import com.tuempresa.cmms.dto.response.AdditionalCostResponse;
import com.tuempresa.cmms.exception.ForbiddenOperationException;
import com.tuempresa.cmms.exception.ResourceNotFoundException;
import com.tuempresa.cmms.model.entity.User;
import com.tuempresa.cmms.model.entity.WorkOrder;
import com.tuempresa.cmms.model.entity.WorkOrderAdditionalCost;
import com.tuempresa.cmms.model.enums.RoleNames;
import com.tuempresa.cmms.repository.UserRepository;
import com.tuempresa.cmms.repository.WorkOrderAdditionalCostRepository;
import com.tuempresa.cmms.repository.WorkOrderRepository;
import com.tuempresa.cmms.security.CurrentUserProvider;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Set;

@Service
@RequiredArgsConstructor
public class WorkOrderAdditionalCostService {

    private static final Set<String> CAN_ADD_COST = Set.of(
            RoleNames.ADMIN, RoleNames.LIMITED_ADMIN, RoleNames.TECHNICIAN, RoleNames.LIMITED_TECHNICIAN);

    private final WorkOrderAdditionalCostRepository costRepository;
    private final WorkOrderRepository workOrderRepository;
    private final UserRepository userRepository;
    private final CurrentUserProvider currentUser;

    @Transactional
    public AdditionalCostResponse create(Long workOrderId, CreateAdditionalCostRequest request) {
        requireRole(CAN_ADD_COST, "agregar costos adicionales");

        WorkOrder wo = workOrderRepository.findById(workOrderId)
                .orElseThrow(() -> new ResourceNotFoundException("Work order no encontrado: id=" + workOrderId));
        User user = userRepository.findById(currentUser.userId())
                .orElseThrow(() -> new ResourceNotFoundException("Usuario no encontrado"));

        WorkOrderAdditionalCost cost = new WorkOrderAdditionalCost();
        cost.setOrganizationId(currentUser.organizationId());
        cost.setWorkOrder(wo);
        cost.setDescription(request.description());
        cost.setCost(request.cost());
        cost.setCategory(request.category());
        cost.setCreatedBy(user);

        return toResponse(costRepository.save(cost));
    }

    @Transactional(readOnly = true)
    public List<AdditionalCostResponse> list(Long workOrderId) {
        return costRepository.findByWorkOrderId(workOrderId).stream().map(this::toResponse).toList();
    }

    @Transactional
    public void delete(Long costId) {
        requireRole(Set.of(RoleNames.ADMIN), "eliminar costos adicionales");
        WorkOrderAdditionalCost cost = costRepository.findById(costId)
                .orElseThrow(() -> new ResourceNotFoundException("Costo no encontrado: id=" + costId));
        costRepository.delete(cost);
    }

    private void requireRole(Set<String> allowedRoles, String action) {
        String role = currentUser.get().getRoleName();
        boolean allowed = role != null && allowedRoles.stream().anyMatch(r -> r.equalsIgnoreCase(role));
        if (!allowed) {
            throw new ForbiddenOperationException("Tu rol (" + role + ") no tiene permiso para " + action + ".");
        }
    }

    private AdditionalCostResponse toResponse(WorkOrderAdditionalCost cost) {
        String creatorName = cost.getCreatedBy() != null
                ? ((cost.getCreatedBy().getFirstName() != null ? cost.getCreatedBy().getFirstName() : "") + " "
                    + (cost.getCreatedBy().getLastName() != null ? cost.getCreatedBy().getLastName() : "")).trim()
                : null;
        return new AdditionalCostResponse(
                cost.getId(), cost.getDescription(), cost.getCost(), cost.getCategory(),
                cost.getCreatedBy() != null ? cost.getCreatedBy().getId() : null, creatorName, cost.getCreatedAt());
    }
}
