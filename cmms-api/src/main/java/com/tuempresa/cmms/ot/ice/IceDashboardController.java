package com.tuempresa.cmms.ot.ice;

import com.fasterxml.jackson.databind.JsonNode;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/ot/ice")
@RequiredArgsConstructor
public class IceDashboardController {

    private final OtDataServiceClient otDataServiceClient;

    @GetMapping(
            "/assets/{assetKey}/dashboard"
    )
    @PreAuthorize(
            "hasAnyRole('ADMIN','LIMITED_ADMIN')"
    )
    public JsonNode dashboard(
            @PathVariable
            final String assetKey
    ) {

        return otDataServiceClient
                .getIceDashboard(assetKey);
    }
}
