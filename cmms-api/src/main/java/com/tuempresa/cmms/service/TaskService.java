package com.tuempresa.cmms.service;

import com.tuempresa.cmms.dto.request.CreateTaskRequest;
import com.tuempresa.cmms.dto.request.UpdateTaskValueRequest;
import com.tuempresa.cmms.dto.response.TaskResponse;
import com.tuempresa.cmms.exception.ResourceNotFoundException;
import com.tuempresa.cmms.model.entity.PreventiveMaintenance;
import com.tuempresa.cmms.model.entity.Task;
import com.tuempresa.cmms.model.entity.WorkOrder;
import com.tuempresa.cmms.repository.PreventiveMaintenanceRepository;
import com.tuempresa.cmms.repository.TaskRepository;
import com.tuempresa.cmms.repository.WorkOrderRepository;
import com.tuempresa.cmms.security.CurrentUserProvider;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class TaskService {

    private final TaskRepository taskRepository;
    private final WorkOrderRepository workOrderRepository;
    private final PreventiveMaintenanceRepository preventiveMaintenanceRepository;
    private final CurrentUserProvider currentUser;

    @Transactional(readOnly = true)
    public List<TaskResponse> listForWorkOrder(Long workOrderId) {
        return taskRepository.findByWorkOrderIdOrderByOrderIndexAsc(workOrderId).stream().map(this::toResponse).toList();
    }

    @Transactional(readOnly = true)
    public List<TaskResponse> listForPM(Long pmId) {
        return taskRepository.findByPreventiveMaintenanceIdOrderByOrderIndexAsc(pmId).stream().map(this::toResponse).toList();
    }

    @Transactional
    public TaskResponse createForWorkOrder(Long workOrderId, CreateTaskRequest request) {
        WorkOrder wo = workOrderRepository.findById(workOrderId)
                .orElseThrow(() -> new ResourceNotFoundException("Work order no encontrado"));
        Task task = new Task();
        task.setOrganizationId(currentUser.organizationId());
        task.setWorkOrder(wo);
        task.setLabel(request.label());
        task.setType(request.type() != null ? request.type() : com.tuempresa.cmms.model.enums.TaskType.TEXT);
        task.setOrderIndex(taskRepository.findByWorkOrderIdOrderByOrderIndexAsc(workOrderId).size());
        return toResponse(taskRepository.save(task));
    }

    @Transactional
    public TaskResponse createForPM(Long pmId, CreateTaskRequest request) {
        PreventiveMaintenance pm = preventiveMaintenanceRepository.findById(pmId)
                .orElseThrow(() -> new ResourceNotFoundException("Mantenimiento preventivo no encontrado"));
        Task task = new Task();
        task.setOrganizationId(currentUser.organizationId());
        task.setPreventiveMaintenance(pm);
        task.setLabel(request.label());
        task.setType(request.type() != null ? request.type() : com.tuempresa.cmms.model.enums.TaskType.TEXT);
        task.setOrderIndex(taskRepository.findByPreventiveMaintenanceIdOrderByOrderIndexAsc(pmId).size());
        return toResponse(taskRepository.save(task));
    }

    @Transactional
    public TaskResponse updateValue(Long taskId, UpdateTaskValueRequest request) {
        Task task = taskRepository.findById(taskId)
                .orElseThrow(() -> new ResourceNotFoundException("Tarea no encontrada"));
        if (request.value() != null) task.setValue(request.value());
        if (request.completed() != null) task.setCompleted(request.completed());
        return toResponse(taskRepository.save(task));
    }

    @Transactional
    public void delete(Long taskId) {
        taskRepository.deleteById(taskId);
    }

    /**
     * Clona las tareas de una orden a otra, sin arrastrar el estado de
     * cumplimiento: la copia arranca con todo pendiente.
     */
    @Transactional
    public void copyTasks(Long origenId, Long destinoId) {
        WorkOrder destino = workOrderRepository.findById(destinoId)
                .orElseThrow(() -> new ResourceNotFoundException("Orden no encontrada: id=" + destinoId));
        List<Task> originales = taskRepository.findByWorkOrderIdOrderByOrderIndexAsc(origenId);
        for (Task original : originales) {
            Task copia = new Task();
            copia.setOrganizationId(destino.getOrganizationId());
            copia.setWorkOrder(destino);
            copia.setLabel(original.getLabel());
            copia.setType(original.getType());
            copia.setOrderIndex(original.getOrderIndex());
            // El valor NO se copia: la orden nueva empieza sin ejecutar.
            taskRepository.save(copia);
        }
    }

    /** Copia las tareas plantilla de un PM a una orden recien generada. */
    @Transactional
    public void copyTasksToWorkOrder(PreventiveMaintenance pm, WorkOrder workOrder) {
        List<Task> templates = taskRepository.findByPreventiveMaintenanceIdOrderByOrderIndexAsc(pm.getId());
        for (Task template : templates) {
            Task copy = new Task();
            copy.setOrganizationId(workOrder.getOrganizationId());
            copy.setWorkOrder(workOrder);
            copy.setLabel(template.getLabel());
            copy.setType(template.getType());
            copy.setOrderIndex(template.getOrderIndex());
            taskRepository.save(copy);
        }
    }

    private TaskResponse toResponse(Task t) {
        return new TaskResponse(t.getId(), t.getLabel(), t.getType(), t.getOrderIndex(), t.getValue(), t.getCompleted());
    }
}
