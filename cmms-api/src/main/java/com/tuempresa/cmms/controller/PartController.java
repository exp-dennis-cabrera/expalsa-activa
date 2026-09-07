package com.tuempresa.cmms.controller;

import com.tuempresa.cmms.dto.request.CreatePartRequest;
import com.tuempresa.cmms.dto.response.PartSummary;
import com.tuempresa.cmms.model.entity.Location;
import com.tuempresa.cmms.model.entity.Part;
import com.tuempresa.cmms.model.entity.User;
import com.tuempresa.cmms.repository.LocationRepository;
import com.tuempresa.cmms.repository.PartRepository;
import com.tuempresa.cmms.repository.UserRepository;
import com.tuempresa.cmms.security.CurrentUserProvider;
import com.tuempresa.cmms.service.NotificationService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import java.util.HashSet;
import java.util.List;
import java.util.Set;

/**
 * Igual que part.getUsers() real de Atlas: al asignar un repuesto a
 * usuarios nuevos, se les notifica.
 */
@RestController
@RequestMapping("/parts")
@RequiredArgsConstructor
public class PartController {

    private final PartRepository partRepository;
    private final LocationRepository locationRepository;
    private final UserRepository userRepository;
    private final NotificationService notificationService;
    private final CurrentUserProvider currentUser;

    @GetMapping
    public List<PartSummary> list() {
        return partRepository.findAll().stream()
                .map(p -> new PartSummary(p.getId(), p.getName(), p.getErpSku(), p.getQuantity(), p.getCost()))
                .toList();
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public PartSummary create(@Valid @RequestBody CreatePartRequest request) {
        Part part = new Part();
        part.setOrganizationId(currentUser.organizationId());
        part.setName(request.name());
        part.setErpSku(request.erpSku());
        part.setQuantity(request.quantity() != null ? request.quantity() : 0);
        part.setMinQuantity(request.minQuantity() != null ? request.minQuantity() : 0);
        part.setCost(request.cost());
        if (request.locationId() != null) {
            Location location = locationRepository.findById(request.locationId()).orElse(null);
            part.setLocation(location);
        }
        applyAssignedUsers(part, request.assignedUserIds(), true);
        Part saved = partRepository.save(part);
        return new PartSummary(saved.getId(), saved.getName(), saved.getErpSku(), saved.getQuantity(), saved.getCost());
    }

    @PutMapping("/{id}")
    public PartSummary update(@PathVariable Long id, @Valid @RequestBody CreatePartRequest request) {
        Part part = partRepository.findById(id).orElseThrow();
        part.setName(request.name());
        part.setErpSku(request.erpSku());
        part.setQuantity(request.quantity() != null ? request.quantity() : part.getQuantity());
        part.setMinQuantity(request.minQuantity() != null ? request.minQuantity() : part.getMinQuantity());
        part.setCost(request.cost());
        part.setLocation(request.locationId() != null ? locationRepository.findById(request.locationId()).orElse(null) : null);
        applyAssignedUsers(part, request.assignedUserIds(), false);
        Part saved = partRepository.save(part);
        return new PartSummary(saved.getId(), saved.getName(), saved.getErpSku(), saved.getQuantity(), saved.getCost());
    }

    /**
     * Reemplaza el set de usuarios asignados, y notifica solo a los que son
     * nuevos respecto al set anterior -- igual que getNewUsersToNotify()
     * real de Atlas.
     */
    private void applyAssignedUsers(Part part, Set<Long> newUserIds, boolean isNew) {
        Set<User> before = isNew ? Set.of() : new HashSet<>(part.getAssignedUsers());
        Set<User> after = newUserIds != null && !newUserIds.isEmpty()
                ? new HashSet<>(userRepository.findAllById(newUserIds)) : new HashSet<>();
        part.setAssignedUsers(after);

        after.stream()
                .filter(u -> before.stream().noneMatch(b -> b.getId().equals(u.getId())))
                .forEach(u -> notificationService.notifyUser(u, "PART", "Nueva asignación",
                        "Se te asigno el repuesto \"" + part.getName() + "\".", part.getId()));
    }
}
