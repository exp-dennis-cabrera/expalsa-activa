package com.tuempresa.cmms.dto.response;

import com.tuempresa.cmms.model.enums.TaskType;

public record TaskResponse(Long id, String label, TaskType type, Integer orderIndex, String value, Boolean completed) {
}
