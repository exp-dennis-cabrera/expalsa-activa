package com.tuempresa.cmms.controller;

import com.tuempresa.cmms.dto.request.CreateMaterialRequestRequest;
import com.tuempresa.cmms.dto.request.DecideMaterialRequestRequest;
import com.tuempresa.cmms.dto.response.MaterialRequestResponse;
import com.tuempresa.cmms.service.MaterialRequestService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * El metodo "decide" (PATCH /{id}/decide) esta escrito para ser el mismo
 * contrato que usara el webhook del ERP el dia que se conecte de verdad
 * (ver seccion 8.2 del documento de requerimientos ERP). Hoy, sin conexion
 * real, un Admin lo dispara a mano desde la UI para simular la respuesta
 * del ERP y no bloquear el trabajo.
 */
@RestController
@RequestMapping("/material-requests")
@RequiredArgsConstructor
public class MaterialRequestController {

    private final MaterialRequestService materialRequestService;

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public MaterialRequestResponse create(@Valid @RequestBody CreateMaterialRequestRequest request) {
        return materialRequestService.create(request);
    }

    @GetMapping("/{id}")
    public MaterialRequestResponse getById(@PathVariable Long id) {
        return materialRequestService.getById(id);
    }

    @GetMapping("/work-order/{workOrderId}")
    public List<MaterialRequestResponse> listForWorkOrder(@PathVariable Long workOrderId) {
        return materialRequestService.listForWorkOrder(workOrderId);
    }

    @PatchMapping("/{id}/decide")
    public MaterialRequestResponse decide(@PathVariable Long id, @Valid @RequestBody DecideMaterialRequestRequest request) {
        return materialRequestService.decide(id, request);
    }
}
