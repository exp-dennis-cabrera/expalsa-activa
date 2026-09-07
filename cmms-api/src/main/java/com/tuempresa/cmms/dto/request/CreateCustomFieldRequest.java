package com.tuempresa.cmms.dto.request;

import com.tuempresa.cmms.model.enums.CustomFieldEntityType;
import com.tuempresa.cmms.model.enums.CustomFieldType;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.util.List;

public record CreateCustomFieldRequest(
        @NotBlank String name,
        @NotNull CustomFieldType type,
        @NotNull CustomFieldEntityType entityType,
        Boolean required,
        Boolean copyOnGenerate,
        List<String> options
) {
}
