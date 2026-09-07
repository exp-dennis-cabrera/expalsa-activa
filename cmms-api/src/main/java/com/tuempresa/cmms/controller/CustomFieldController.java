package com.tuempresa.cmms.controller;

import com.tuempresa.cmms.dto.request.CreateCustomFieldRequest;
import com.tuempresa.cmms.dto.request.SetCustomFieldValueRequest;
import com.tuempresa.cmms.dto.response.CustomFieldResponse;
import com.tuempresa.cmms.dto.response.CustomFieldValueResponse;
import com.tuempresa.cmms.model.enums.CustomFieldEntityType;
import com.tuempresa.cmms.service.CustomFieldService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequiredArgsConstructor
public class CustomFieldController {

    private final CustomFieldService customFieldService;

    @PostMapping("/custom-fields")
    @ResponseStatus(HttpStatus.CREATED)
    public CustomFieldResponse create(@Valid @RequestBody CreateCustomFieldRequest request) {
        return customFieldService.create(request);
    }

    @GetMapping("/custom-fields")
    public List<CustomFieldResponse> list(@RequestParam CustomFieldEntityType entityType) {
        return customFieldService.listByEntityType(entityType);
    }

    @DeleteMapping("/custom-fields/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable Long id) {
        customFieldService.delete(id);
    }

    @GetMapping("/work-orders/{woId}/custom-field-values")
    public List<CustomFieldValueResponse> getForWorkOrder(@PathVariable Long woId) {
        return customFieldService.getValuesForWorkOrder(woId);
    }

    @PutMapping("/work-orders/{woId}/custom-field-values")
    public void setForWorkOrder(@PathVariable Long woId, @RequestBody SetCustomFieldValueRequest request) {
        customFieldService.setValuesForWorkOrder(woId, request);
    }

    @GetMapping("/preventive-maintenances/{pmId}/custom-field-values")
    public List<CustomFieldValueResponse> getForPM(@PathVariable Long pmId) {
        return customFieldService.getValuesForPM(pmId);
    }

    @PutMapping("/preventive-maintenances/{pmId}/custom-field-values")
    public void setForPM(@PathVariable Long pmId, @RequestBody SetCustomFieldValueRequest request) {
        customFieldService.setValuesForPM(pmId, request);
    }
}
