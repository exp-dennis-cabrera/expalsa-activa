package com.tuempresa.cmms.controller;

import com.tuempresa.cmms.dto.request.CreateTaskRequest;
import com.tuempresa.cmms.dto.request.UpdateTaskValueRequest;
import com.tuempresa.cmms.dto.response.TaskResponse;
import com.tuempresa.cmms.service.TaskService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequiredArgsConstructor
public class TaskController {

    private final TaskService taskService;

    @GetMapping("/work-orders/{woId}/tasks")
    public List<TaskResponse> listForWorkOrder(@PathVariable Long woId) {
        return taskService.listForWorkOrder(woId);
    }

    @PostMapping("/work-orders/{woId}/tasks")
    @ResponseStatus(HttpStatus.CREATED)
    public TaskResponse createForWorkOrder(@PathVariable Long woId, @Valid @RequestBody CreateTaskRequest request) {
        return taskService.createForWorkOrder(woId, request);
    }

    @GetMapping("/preventive-maintenances/{pmId}/tasks")
    public List<TaskResponse> listForPM(@PathVariable Long pmId) {
        return taskService.listForPM(pmId);
    }

    @PostMapping("/preventive-maintenances/{pmId}/tasks")
    @ResponseStatus(HttpStatus.CREATED)
    public TaskResponse createForPM(@PathVariable Long pmId, @Valid @RequestBody CreateTaskRequest request) {
        return taskService.createForPM(pmId, request);
    }

    @PatchMapping("/tasks/{taskId}")
    public TaskResponse updateValue(@PathVariable Long taskId, @RequestBody UpdateTaskValueRequest request) {
        return taskService.updateValue(taskId, request);
    }

    @DeleteMapping("/tasks/{taskId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable Long taskId) {
        taskService.delete(taskId);
    }
}
