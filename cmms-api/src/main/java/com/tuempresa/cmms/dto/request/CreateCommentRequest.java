package com.tuempresa.cmms.dto.request;

import jakarta.validation.constraints.NotBlank;

public record CreateCommentRequest(@NotBlank String content, java.util.List<Long> fileIds) {
}
