package com.tuempresa.cmms.service;

import com.tuempresa.cmms.dto.request.CreateMaterialRequestRequest;
import com.tuempresa.cmms.dto.request.DecideMaterialRequestRequest;
import com.tuempresa.cmms.dto.response.MaterialRequestResponse;
import com.tuempresa.cmms.exception.ForbiddenOperationException;
import com.tuempresa.cmms.exception.ResourceNotFoundException;
import com.tuempresa.cmms.model.entity.*;
import com.tuempresa.cmms.model.enums.MaterialRequestStatus;
import com.tuempresa.cmms.model.enums.RoleCode;
import com.tuempresa.cmms.repository.MaterialRequestRepository;
import com.tuempresa.cmms.repository.PartRepository;
import com.tuempresa.cmms.repository.UserRepository;
import com.tuempresa.cmms.repository.WorkOrderRepository;
import com.tuempresa.cmms.security.CurrentUserProvider;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;

/**
 * Solicitud de materiales a bodega: el supervisor la crea desde una orden de
 * trabajo, el ERP corre su propia aprobacion (circuito interno de compras),
 * y cuando resuelve nos avisa. Como todavia no hay conexion real al ERP, el
 * metodo decide() es el mismo que llamaria el webhook del ERP el dia que se
 * conecte -- por ahora, un Admin lo dispara a mano desde la UI para simular
 * esa respuesta y poder seguir trabajando.
 */
@Service
@RequiredArgsConstructor
public class MaterialRequestService {

    private final MaterialRequestRepository materialRequestRepository;
    private final WorkOrderRepository workOrderRepository;
    private final PartRepository partRepository;
    private final UserRepository userRepository;
    private final NotificationService notificationService;
    private final CurrentUserProvider currentUser;

    @Transactional
    public MaterialRequestResponse create(CreateMaterialRequestRequest request) {
        WorkOrder workOrder = workOrderRepository.findById(request.workOrderId())
                .orElseThrow(() -> new ResourceNotFoundException("Orden de trabajo no encontrada: id=" + request.workOrderId()));

        MaterialRequest materialRequest = new MaterialRequest();
        materialRequest.setOrganizationId(currentUser.organizationId());
        materialRequest.setWorkOrder(workOrder);
        materialRequest.setNotes(request.notes());
        materialRequest.setRequestedBy(userRepository.findById(currentUser.userId()).orElse(null));
        materialRequest.setStatus(MaterialRequestStatus.PENDING);

        for (CreateMaterialRequestRequest.ItemInput itemInput : request.items()) {
            Part part = partRepository.findById(itemInput.partId())
                    .orElseThrow(() -> new ResourceNotFoundException("Repuesto no encontrado: id=" + itemInput.partId()));
            MaterialRequestItem item = new MaterialRequestItem();
            item.setOrganizationId(currentUser.organizationId());
            item.setMaterialRequest(materialRequest);
            item.setPart(part);
            item.setRequestedQuantity(itemInput.quantity());
            materialRequest.getItems().add(item);
        }

        MaterialRequest saved = materialRequestRepository.save(materialRequest);

        // Aca es donde, con el ERP ya conectado, se haria la llamada saliente
        // real (POST a su endpoint de solicitudes) con el contrato descrito
        // en el documento de requerimientos. Por ahora queda en PENDING y se
        // resuelve manualmente desde la UI (ver decide()).

        notifyAdmins(saved);
        return toResponse(saved);
    }

    @Transactional(readOnly = true)
    public List<MaterialRequestResponse> listForWorkOrder(Long workOrderId) {
        return materialRequestRepository.findByWorkOrderIdOrderByCreatedAtDesc(workOrderId).stream()
                .map(this::toResponse).toList();
    }

    @Transactional(readOnly = true)
    public MaterialRequestResponse getById(Long id) {
        return toResponse(findOrThrow(id));
    }

    /**
     * Mismo metodo que usara el webhook del ERP el dia de manana. Hoy lo
     * dispara un Admin a mano desde la UI para simular la respuesta.
     */
    @Transactional
    public MaterialRequestResponse decide(Long id, DecideMaterialRequestRequest request) {
        MaterialRequest materialRequest = findOrThrow(id);
        if (materialRequest.getStatus() != MaterialRequestStatus.PENDING) {
            throw new ForbiddenOperationException("Esta solicitud ya fue resuelta.");
        }

        materialRequest.setStatus(request.status());
        materialRequest.setRejectionReason(request.rejectionReason());
        materialRequest.setDecidedByErp(request.decidedByErp());
        materialRequest.setDecidedAt(Instant.now());

        if (request.approvedQuantitiesByItemId() != null) {
            for (MaterialRequestItem item : materialRequest.getItems()) {
                Integer approved = request.approvedQuantitiesByItemId().get(item.getId());
                if (approved != null) item.setApprovedQuantity(approved);
                else if (request.status() == MaterialRequestStatus.APPROVED) item.setApprovedQuantity(item.getRequestedQuantity());
            }
        } else if (request.status() == MaterialRequestStatus.APPROVED) {
            materialRequest.getItems().forEach(item -> item.setApprovedQuantity(item.getRequestedQuantity()));
        }

        MaterialRequest saved = materialRequestRepository.save(materialRequest);

        if (saved.getRequestedBy() != null) {
            String title = saved.getStatus() == MaterialRequestStatus.APPROVED
                    ? "Solicitud de materiales aprobada" : "Solicitud de materiales rechazada";
            String message = saved.getStatus() == MaterialRequestStatus.APPROVED
                    ? "Tu solicitud de materiales para \"" + saved.getWorkOrder().getTitle() + "\" fue aprobada. Ya puedes retirar de bodega."
                    : "Tu solicitud de materiales para \"" + saved.getWorkOrder().getTitle() + "\" fue rechazada."
                    + (saved.getRejectionReason() != null ? " Motivo: " + saved.getRejectionReason() : "");
            notificationService.notifyUser(saved.getRequestedBy(), "MATERIAL_REQUEST", title, message, saved.getWorkOrder().getId());
        }

        return toResponse(saved);
    }

    private void notifyAdmins(MaterialRequest materialRequest) {
        String requesterName = materialRequest.getRequestedBy() != null ? fullName(materialRequest.getRequestedBy()) : "alguien";
        String message = "Nueva solicitud de materiales para \"" + materialRequest.getWorkOrder().getTitle()
                + "\", pedida por " + requesterName + ".";
        userRepository.findByRoleNameInAndOrganizationId(
                        List.of(RoleCode.ADMIN, RoleCode.LIMITED_ADMIN), materialRequest.getOrganizationId())
                .forEach(admin -> notificationService.notifyUser(admin, "MATERIAL_REQUEST", "Nueva solicitud de materiales",
                        message, materialRequest.getWorkOrder().getId()));
    }

    private MaterialRequest findOrThrow(Long id) {
        return materialRequestRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Solicitud de materiales no encontrada: id=" + id));
    }

    private MaterialRequestResponse toResponse(MaterialRequest m) {
        return new MaterialRequestResponse(
                m.getId(), m.getWorkOrder().getId(),
                m.getRequestedBy() != null ? m.getRequestedBy().getId() : null,
                m.getRequestedBy() != null ? fullName(m.getRequestedBy()) : null,
                m.getStatus(), m.getNotes(), m.getErpRequestId(), m.getRejectionReason(),
                m.getDecidedByErp(), m.getDecidedAt(),
                m.getItems().stream().map(i -> new MaterialRequestResponse.ItemResponse(
                        i.getId(), i.getPart().getId(), i.getPart().getName(), i.getPart().getErpSku(), i.getRequestedQuantity(), i.getApprovedQuantity()
                )).toList(),
                m.getCreatedAt()
        );
    }

    private String fullName(User u) {
        String first = u.getFirstName() != null ? u.getFirstName() : "";
        String last = u.getLastName() != null ? u.getLastName() : "";
        return (first + " " + last).trim();
    }
}
