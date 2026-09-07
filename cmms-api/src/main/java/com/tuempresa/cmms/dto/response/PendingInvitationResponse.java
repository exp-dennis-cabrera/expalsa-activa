package com.tuempresa.cmms.dto.response;

import java.time.Instant;

public record PendingInvitationResponse(Long id, String email, Long roleId, String roleName, Instant createdAt) {
}
