package com.tuempresa.cmms.controller;

import com.tuempresa.cmms.dto.request.CreateVendorRequest;
import com.tuempresa.cmms.dto.response.VendorSummary;
import com.tuempresa.cmms.model.entity.Vendor;
import com.tuempresa.cmms.repository.VendorRepository;
import com.tuempresa.cmms.security.CurrentUserProvider;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/vendors")
@RequiredArgsConstructor
public class VendorController {

    private final VendorRepository vendorRepository;
    private final CurrentUserProvider currentUser;

    @GetMapping
    public List<VendorSummary> list() {
        return vendorRepository.findAll().stream().map(this::toResponse).toList();
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public VendorSummary create(@Valid @RequestBody CreateVendorRequest request) {
        Vendor vendor = new Vendor();
        vendor.setOrganizationId(currentUser.organizationId());
        vendor.setCompanyName(request.companyName());
        vendor.setVendorType(request.vendorType());
        vendor.setRate(request.rate());
        vendor.setEmail(request.email());
        return toResponse(vendorRepository.save(vendor));
    }

    private VendorSummary toResponse(Vendor v) {
        return new VendorSummary(v.getId(), v.getCompanyName(), v.getVendorType(), v.getRate(), v.getEmail());
    }
}
