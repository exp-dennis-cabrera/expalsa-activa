package com.tuempresa.cmms.dto.response;

import com.tuempresa.cmms.model.enums.CustomFieldEntityType;
import com.tuempresa.cmms.model.enums.CustomFieldType;

import java.util.List;

public record CustomFieldResponse(
        Long id, String name, CustomFieldType type, CustomFieldEntityType entityType,
        Boolean required, Boolean copyOnGenerate, List<String> options
) {
}
