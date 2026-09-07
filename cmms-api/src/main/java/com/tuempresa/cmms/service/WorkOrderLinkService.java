package com.tuempresa.cmms.service;

import com.tuempresa.cmms.dto.request.CreateWorkOrderLinkRequest;
import com.tuempresa.cmms.dto.response.WorkOrderLinkResponse;
import com.tuempresa.cmms.exception.ForbiddenOperationException;
import com.tuempresa.cmms.exception.ResourceNotFoundException;
import com.tuempresa.cmms.model.entity.WorkOrder;
import com.tuempresa.cmms.model.entity.WorkOrderLink;
import com.tuempresa.cmms.repository.WorkOrderLinkRepository;
import com.tuempresa.cmms.repository.WorkOrderRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class WorkOrderLinkService {

    private final WorkOrderLinkRepository linkRepository;
    private final WorkOrderRepository workOrderRepository;

    @Transactional
    public WorkOrderLinkResponse addLink(Long workOrderId, CreateWorkOrderLinkRequest request) {
        if (workOrderId.equals(request.linkedWorkOrderId())) {
            throw new ForbiddenOperationException("Una orden no puede vincularse a si misma.");
        }
        WorkOrder wo = findOrThrow(workOrderId);
        WorkOrder linked = findOrThrow(request.linkedWorkOrderId());

        WorkOrderLink link = new WorkOrderLink();
        link.setWorkOrder(wo);
        link.setLinkedWorkOrder(linked);
        WorkOrderLink saved = linkRepository.save(link);

        return new WorkOrderLinkResponse(saved.getId(), linked.getId(), linked.getTitle(), linked.getStatus());
    }

    @Transactional(readOnly = true)
    public List<WorkOrderLinkResponse> list(Long workOrderId) {
        return linkRepository.findAllInvolving(workOrderId).stream()
                .map(l -> {
                    // El "otro lado" del vinculo, sin importar en que direccion se guardo.
                    WorkOrder other = l.getWorkOrder().getId().equals(workOrderId) ? l.getLinkedWorkOrder() : l.getWorkOrder();
                    return new WorkOrderLinkResponse(l.getId(), other.getId(), other.getTitle(), other.getStatus());
                })
                .toList();
    }

    @Transactional
    public void removeLink(Long linkId) {
        WorkOrderLink link = linkRepository.findById(linkId)
                .orElseThrow(() -> new ResourceNotFoundException("Vinculo no encontrado: id=" + linkId));
        linkRepository.delete(link);
    }

    private WorkOrder findOrThrow(Long id) {
        return workOrderRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Work order no encontrado: id=" + id));
    }
}
