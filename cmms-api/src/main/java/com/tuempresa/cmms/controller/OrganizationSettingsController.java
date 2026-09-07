package com.tuempresa.cmms.controller;

import com.tuempresa.cmms.exception.ResourceNotFoundException;
import com.tuempresa.cmms.model.entity.Organization;
import com.tuempresa.cmms.model.enums.PermissionEntity;
import com.tuempresa.cmms.repository.OrganizationRepository;
import com.tuempresa.cmms.security.CurrentUserProvider;
import com.tuempresa.cmms.service.PermissionService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.time.LocalTime;

/**
 * Ajustes generales de la organizacion: hora limite de lecturas y horarios
 * de los dos turnos de planta.
 */
@RestController
@RequestMapping("/settings/organization")
@RequiredArgsConstructor
public class OrganizationSettingsController {

    private final OrganizationRepository organizationRepository;
    private final CurrentUserProvider currentUser;
    private final PermissionService permissionService;

    public record OrganizationSettingsResponse(
            Integer readingDeadlineHour, String timezone,
            LocalTime dayShiftStart, LocalTime dayShiftEnd,
            LocalTime nightShiftStart, LocalTime nightShiftEnd) {
    }

    public record UpdateOrganizationSettingsRequest(
            Integer readingDeadlineHour,
            LocalTime dayShiftStart, LocalTime dayShiftEnd,
            LocalTime nightShiftStart, LocalTime nightShiftEnd) {
    }

    @GetMapping
    public OrganizationSettingsResponse get() {
        return toResponse(findOrThrow());
    }

    @PatchMapping
    public OrganizationSettingsResponse update(@RequestBody UpdateOrganizationSettingsRequest request) {
        permissionService.requireView(PermissionEntity.SETTINGS);
        Organization org = findOrThrow();

        if (request.readingDeadlineHour() != null) {
            if (request.readingDeadlineHour() < 0 || request.readingDeadlineHour() > 23) {
                throw new IllegalArgumentException("La hora límite debe estar entre 0 y 23.");
            }
            org.setReadingDeadlineHour(request.readingDeadlineHour());
        }

        // Los horarios pueden cruzar la medianoche (el turno nocturno va de
        // 19:00 a 07:00), asi que NO se valida que el fin sea posterior al
        // inicio -- seria incorrecto para ese caso.
        if (request.dayShiftStart() != null) org.setDayShiftStart(request.dayShiftStart());
        if (request.dayShiftEnd() != null) org.setDayShiftEnd(request.dayShiftEnd());
        if (request.nightShiftStart() != null) org.setNightShiftStart(request.nightShiftStart());
        if (request.nightShiftEnd() != null) org.setNightShiftEnd(request.nightShiftEnd());

        organizationRepository.save(org);
        return toResponse(org);
    }

    private OrganizationSettingsResponse toResponse(Organization org) {
        return new OrganizationSettingsResponse(
                org.getReadingDeadlineHour() != null ? org.getReadingDeadlineHour() : 7,
                org.getTimezone(),
                org.getDayShiftStart(), org.getDayShiftEnd(),
                org.getNightShiftStart(), org.getNightShiftEnd());
    }

    private Organization findOrThrow() {
        return organizationRepository.findById(currentUser.organizationId())
                .orElseThrow(() -> new ResourceNotFoundException("Organización no encontrada"));
    }
}
