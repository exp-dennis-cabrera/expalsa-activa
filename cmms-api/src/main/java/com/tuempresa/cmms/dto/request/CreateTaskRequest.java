package com.tuempresa.cmms.dto.request;

import com.tuempresa.cmms.model.enums.TaskType;
import jakarta.validation.constraints.NotBlank;

public record CreateTaskRequest(@NotBlank String label, TaskType type) {
}
