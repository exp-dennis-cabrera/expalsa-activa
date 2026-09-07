package com.tuempresa.cmms.controller;

import com.tuempresa.cmms.dto.request.CreateFloorPlanRequest;
import com.tuempresa.cmms.dto.request.CreateLocationRequest;
import com.tuempresa.cmms.dto.response.*;
import com.tuempresa.cmms.model.entity.Location;
import com.tuempresa.cmms.repository.LocationRepository;
import com.tuempresa.cmms.security.CurrentUserProvider;
import com.tuempresa.cmms.service.FileAttachmentService;
import com.tuempresa.cmms.service.LocationService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;

@RestController
@RequestMapping("/locations")
@RequiredArgsConstructor
public class LocationController {

    private final LocationRepository locationRepository;
    private final LocationService locationService;
    private final FileAttachmentService fileAttachmentService;
    private final CurrentUserProvider currentUser;

    // Selector liviano (id+nombre), usado por el resto de la app -- se
    // mantiene igual para no romper los formularios que ya lo usan.
    @GetMapping
    public List<LocationSummary> list() {
        return locationRepository.findAll().stream()
                .map(l -> new LocationSummary(l.getId(), l.getName()))
                .toList();
    }

    /** Copia fiel de GET /locations/children/{id}/paginated real. */
    @GetMapping("/children/{id}/paginated")
    public com.tuempresa.cmms.dto.response.PageResponse<LocationResponse> childrenPaginated(
            @PathVariable Long id,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        return locationService.findLocationChildren(id, page, size);
    }

    @GetMapping("/hierarchy")
    public List<LocationResponse> hierarchy() {
        return locationService.listAllForHierarchy();
    }

    @GetMapping("/children/{id}")
    public List<LocationResponse> children(@PathVariable Long id) {
        return locationService.getChildren(id);
    }

    @GetMapping("/export")
    public org.springframework.http.ResponseEntity<byte[]> export() {
        return com.tuempresa.cmms.util.CsvResponse.of(
                locationService.exportLocationsCsv(), "ubicaciones.csv");
    }

    /** Listado paginado con detalle completo -- igual proposito que POST /locations/search real. */
    @GetMapping("/search")
    public com.tuempresa.cmms.dto.response.PageResponse<LocationResponse> search(
            @RequestParam(required = false) String search,
            @org.springdoc.core.annotations.ParameterObject
            @org.springframework.data.web.PageableDefault(size = 20, sort = "createdAt", direction = org.springframework.data.domain.Sort.Direction.DESC)
            org.springframework.data.domain.Pageable pageable) {
        return com.tuempresa.cmms.dto.response.PageResponse.from(locationService.search(search, pageable));
    }

    @GetMapping("/{id}")
    public LocationResponse getById(@PathVariable Long id) {
        return locationService.getById(id);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public LocationResponse create(@Valid @RequestBody CreateLocationRequest request) {
        return locationService.create(request);
    }

    @PatchMapping("/{id}")
    public LocationResponse update(@PathVariable Long id, @Valid @RequestBody CreateLocationRequest request) {
        return locationService.update(id, request);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable Long id) {
        locationService.delete(id);
    }

    @GetMapping("/{id}/assets")
    public List<AssetResponse> getAssets(@PathVariable Long id) {
        return locationService.getAssets(id);
    }

    @GetMapping("/{id}/work-orders")
    public List<WorkOrderResponse> getWorkOrders(@PathVariable Long id) {
        return locationService.getWorkOrders(id);
    }

    @GetMapping("/{id}/files")
    public List<FileResponse> getFiles(@PathVariable Long id) {
        return fileAttachmentService.listForLocation(id);
    }

    @PostMapping(value = "/{id}/files", consumes = "multipart/form-data")
    public FileResponse uploadFile(@PathVariable Long id, @RequestParam("file") MultipartFile file) {
        return fileAttachmentService.uploadForLocation(id, file);
    }

    @GetMapping("/{id}/floor-plans")
    public List<FloorPlanResponse> getFloorPlans(@PathVariable Long id) {
        return locationService.getFloorPlans(id);
    }

    @PostMapping("/{id}/floor-plans")
    @ResponseStatus(HttpStatus.CREATED)
    public FloorPlanResponse createFloorPlan(@PathVariable Long id, @Valid @RequestBody CreateFloorPlanRequest request) {
        return locationService.createFloorPlan(id, request);
    }

    @DeleteMapping("/floor-plans/{floorPlanId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteFloorPlan(@PathVariable Long floorPlanId) {
        locationService.deleteFloorPlan(floorPlanId);
    }
}
