package com.tuempresa.cmms.dto.ai;

import jakarta.validation.constraints.NotBlank;

public record SuggestClassificationRequest(@NotBlank String title, String description) {
}
