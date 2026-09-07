package com.tuempresa.cmms.dto.request;

import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;

import java.util.List;

public record InviteUsersRequest(
        @NotEmpty List<String> emails,
        @NotNull Long roleId
) {
}
