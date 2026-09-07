package com.tuempresa.cmms.dto.request;

import jakarta.validation.constraints.NotBlank;

public record CreateVendorRequest(@NotBlank String companyName, String vendorType, Double rate, String email) {
}
