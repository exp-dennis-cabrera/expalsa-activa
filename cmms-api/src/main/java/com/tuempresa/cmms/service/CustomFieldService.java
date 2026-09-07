package com.tuempresa.cmms.service;

import com.tuempresa.cmms.dto.request.CreateCustomFieldRequest;
import com.tuempresa.cmms.dto.request.SetCustomFieldValueRequest;
import com.tuempresa.cmms.dto.response.CustomFieldResponse;
import com.tuempresa.cmms.dto.response.CustomFieldValueResponse;
import com.tuempresa.cmms.exception.ResourceNotFoundException;
import com.tuempresa.cmms.model.entity.CustomField;
import com.tuempresa.cmms.model.entity.CustomFieldValue;
import com.tuempresa.cmms.model.entity.PreventiveMaintenance;
import com.tuempresa.cmms.model.entity.WorkOrder;
import com.tuempresa.cmms.model.enums.CustomFieldEntityType;
import com.tuempresa.cmms.repository.CustomFieldRepository;
import com.tuempresa.cmms.repository.CustomFieldValueRepository;
import com.tuempresa.cmms.repository.PreventiveMaintenanceRepository;
import com.tuempresa.cmms.repository.WorkOrderRepository;
import com.tuempresa.cmms.security.CurrentUserProvider;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Map;

/**
 * Version funcional simplificada del sistema de Campos Personalizados real
 * de Atlas: definicion por tipo de entidad (Orden de trabajo / PM / Activo),
 * con "copyOnGenerate" para copiar el valor de un PM a cada orden que genera
 * -- igual idea que copyOnRepeat real. Simplificado: sin validacion de
 * formato por tipo mas alla del campo `required`, sin campos anidados ni
 * dependientes entre si.
 */
@Service
@RequiredArgsConstructor
public class CustomFieldService {

    private final CustomFieldRepository customFieldRepository;
    private final CustomFieldValueRepository customFieldValueRepository;
    private final WorkOrderRepository workOrderRepository;
    private final PreventiveMaintenanceRepository preventiveMaintenanceRepository;
    private final CurrentUserProvider currentUser;

    @Transactional
    public CustomFieldResponse create(CreateCustomFieldRequest request) {
        CustomField cf = new CustomField();
        cf.setOrganizationId(currentUser.organizationId());
        cf.setName(request.name());
        cf.setType(request.type());
        cf.setEntityType(request.entityType());
        cf.setRequired(Boolean.TRUE.equals(request.required()));
        cf.setCopyOnGenerate(request.copyOnGenerate() == null || request.copyOnGenerate());
        cf.setOptions(request.options() != null ? request.options() : List.of());
        return toResponse(customFieldRepository.save(cf));
    }

    @Transactional(readOnly = true)
    public List<CustomFieldResponse> listByEntityType(CustomFieldEntityType entityType) {
        return customFieldRepository.findByEntityType(entityType).stream().map(this::toResponse).toList();
    }

    @Transactional
    public void delete(Long id) {
        customFieldRepository.deleteById(id);
    }

    @Transactional(readOnly = true)
    public List<CustomFieldValueResponse> getValuesForWorkOrder(Long workOrderId) {
        return customFieldValueRepository.findByWorkOrderId(workOrderId).stream()
                .map(v -> new CustomFieldValueResponse(v.getCustomField().getId(), v.getCustomField().getName(), v.getValue()))
                .toList();
    }

    @Transactional(readOnly = true)
    public List<CustomFieldValueResponse> getValuesForPM(Long pmId) {
        return customFieldValueRepository.findByPreventiveMaintenanceId(pmId).stream()
                .map(v -> new CustomFieldValueResponse(v.getCustomField().getId(), v.getCustomField().getName(), v.getValue()))
                .toList();
    }

    @Transactional
    public void setValuesForWorkOrder(Long workOrderId, SetCustomFieldValueRequest request) {
        WorkOrder wo = workOrderRepository.findById(workOrderId)
                .orElseThrow(() -> new ResourceNotFoundException("Work order no encontrado"));
        for (Map.Entry<Long, String> entry : request.values().entrySet()) {
            upsertValue(entry.getKey(), entry.getValue(), wo, null);
        }
    }

    @Transactional
    public void setValuesForPM(Long pmId, SetCustomFieldValueRequest request) {
        PreventiveMaintenance pm = preventiveMaintenanceRepository.findById(pmId)
                .orElseThrow(() -> new ResourceNotFoundException("Mantenimiento preventivo no encontrado"));
        for (Map.Entry<Long, String> entry : request.values().entrySet()) {
            upsertValue(entry.getKey(), entry.getValue(), null, pm);
        }
    }

    private void upsertValue(Long customFieldId, String value, WorkOrder wo, PreventiveMaintenance pm) {
        CustomField cf = customFieldRepository.findById(customFieldId)
                .orElseThrow(() -> new ResourceNotFoundException("Campo personalizado no encontrado"));
        // Upsert de verdad: si ya existe valor para ese campo se ACTUALIZA.
        // Antes se creaba una fila nueva en cada llamada, y como el frontend
        // guarda mientras se escribe, "Motor" dejaba 5 filas. Al releer, el
        // valor devuelto dependia del orden de la consulta.
        CustomFieldValue cfv = (wo != null
                ? customFieldValueRepository.findByWorkOrderIdAndCustomFieldId(wo.getId(), customFieldId)
                : customFieldValueRepository.findByPreventiveMaintenanceIdAndCustomFieldId(pm.getId(), customFieldId))
                .orElseGet(() -> {
                    CustomFieldValue nuevo = new CustomFieldValue();
                    nuevo.setOrganizationId(currentUser.organizationId());
                    nuevo.setCustomField(cf);
                    nuevo.setWorkOrder(wo);
                    nuevo.setPreventiveMaintenance(pm);
                    return nuevo;
                });
        cfv.setValue(value);
        customFieldValueRepository.save(cfv);
    }

    /** Copia los valores marcados copyOnGenerate de un PM a la orden recien generada. */
    @Transactional
    public void copyValuesToWorkOrder(PreventiveMaintenance pm, WorkOrder workOrder) {
        List<CustomFieldValue> pmValues = customFieldValueRepository.findByPreventiveMaintenanceId(pm.getId());
        for (CustomFieldValue pmValue : pmValues) {
            if (!Boolean.TRUE.equals(pmValue.getCustomField().getCopyOnGenerate())) continue;
            CustomFieldValue copy = new CustomFieldValue();
            copy.setOrganizationId(workOrder.getOrganizationId());
            copy.setCustomField(pmValue.getCustomField());
            copy.setWorkOrder(workOrder);
            copy.setValue(pmValue.getValue());
            customFieldValueRepository.save(copy);
        }
    }

    private CustomFieldResponse toResponse(CustomField cf) {
        return new CustomFieldResponse(cf.getId(), cf.getName(), cf.getType(), cf.getEntityType(),
                cf.getRequired(), cf.getCopyOnGenerate(), new java.util.ArrayList<>(cf.getOptions()));
    }
}
