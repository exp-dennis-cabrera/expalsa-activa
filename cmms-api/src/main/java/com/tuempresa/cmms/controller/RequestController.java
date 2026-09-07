package com.tuempresa.cmms.controller;

import com.tuempresa.cmms.dto.request.*;
import com.tuempresa.cmms.dto.response.RequestResponse;
import com.tuempresa.cmms.dto.response.WorkOrderResponse;
import com.tuempresa.cmms.service.RequestService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/requests")
@RequiredArgsConstructor
public class RequestController {

    private final RequestService requestService;

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public RequestResponse create(@Valid @RequestBody CreateRequestRequest request) {
        return requestService.create(request);
    }

    @GetMapping
    public List<RequestResponse> list() {
        return requestService.list();
    }

    @GetMapping("/pending-count")
    public Map<String, Long> pendingCount() {
        return Map.of("count", requestService.countPending());
    }

    @GetMapping("/{id}")
    public RequestResponse getById(@PathVariable Long id) {
        return requestService.getById(id);
    }

    @PatchMapping("/{id}")
    public RequestResponse update(@PathVariable Long id, @Valid @RequestBody CreateRequestRequest request) {
        return requestService.update(id, request);
    }

    @PatchMapping("/{id}/approve")
    public WorkOrderResponse approve(@PathVariable Long id, @RequestBody ApproveRequestRequest request) {
        return requestService.approve(id, request);
    }

    @PatchMapping("/{id}/cancel")
    public RequestResponse cancel(@PathVariable Long id, @Valid @RequestBody CancelRequestRequest request) {
        return requestService.cancel(id, request);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable Long id) {
        requestService.delete(id);
    }
}
