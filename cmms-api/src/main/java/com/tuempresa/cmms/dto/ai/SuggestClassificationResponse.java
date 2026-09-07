package com.tuempresa.cmms.dto.ai;

public record SuggestClassificationResponse(
        Long suggestedCategoryId,
        String suggestedCategoryName,
        String suggestedPriority, // NONE | LOW | MEDIUM | HIGH
        String reasoning
) {
}
