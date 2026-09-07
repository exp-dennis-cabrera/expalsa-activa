package com.tuempresa.cmms.dto.response;

public record UserSummary(
        Long id,
        String fullName,
        String email,
        String roleName,
        Double hourlyRate,
        String phone,
        String jobTitle,
        String status
) {
}
