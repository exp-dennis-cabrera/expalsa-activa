package com.tuempresa.cmms.controller;

import com.tuempresa.cmms.dto.request.*;
import com.tuempresa.cmms.dto.response.*;
import com.tuempresa.cmms.service.AssetService;
import com.tuempresa.cmms.service.FileAttachmentService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springdoc.core.annotations.ParameterObject;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.time.Instant;
import java.util.List;

@RestController
@RequestMapping("/assets")
@RequiredArgsConstructor
public class AssetController {

    private final AssetService assetService;
    private final FileAttachmentService fileAttachmentService;

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public AssetResponse create(@Valid @RequestBody CreateAssetRequest request) {
        return assetService.create(request);
    }

    @GetMapping("/{id}")
    public AssetResponse getById(@PathVariable Long id) {
        return assetService.getById(id);
    }

    // Rutas propias (no /{id}) para no chocar con la busqueda por id numerico.
    @GetMapping("/by-barcode/{code}")
    public AssetResponse getByBarCode(@PathVariable String code) {
        return assetService.getByBarCode(code);
    }

    @GetMapping("/by-nfc/{code}")
    public AssetResponse getByNfc(@PathVariable String code) {
        return assetService.getByNfc(code);
    }

    @GetMapping
    public PageResponse<AssetResponse> list(
            @RequestParam(required = false) String status,
            @RequestParam(required = false) Long locationId,
            @RequestParam(required = false) String search,
            @ParameterObject @PageableDefault(size = 20, sort = "createdAt", direction = Sort.Direction.DESC) Pageable pageable) {
        return PageResponse.from(assetService.list(status, locationId, search, pageable));
    }

    /**
     * Copia fiel de GET /assets/children/{id}/paginated real
     * (AssetController.getChildrenByIdPaginated).
     *
     * Devuelve los hijos directos de un activo, paginados. El arbol carga
     * un nivel a la vez, al expandir, en vez de traer todo de golpe.
     *
     * id = 0 significa la RAIZ (los activos sin padre) -- misma convencion
     * que el original.
     */
    @GetMapping("/children/{id}/paginated")
    public com.tuempresa.cmms.dto.response.PageResponse<AssetResponse> childrenPaginated(
            @PathVariable Long id,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        return assetService.findAssetChildren(id, page, size);
    }

    /** Repuestos del activo. Alimenta la pestaña "Repuestos" del detalle. */
    @GetMapping("/{id}/parts")
    public java.util.List<com.tuempresa.cmms.dto.response.PartSummary> parts(@PathVariable Long id) {
        return assetService.listParts(id);
    }

    /** Igual que la opcion "Exportar" del menu de activos real. */
    @GetMapping("/export")
    public org.springframework.http.ResponseEntity<byte[]> export() {
        return com.tuempresa.cmms.util.CsvResponse.of(
                assetService.exportAssetsCsv(), "activos.csv");
    }

    @GetMapping("/hierarchy")
    public List<AssetResponse> hierarchy() {
        return assetService.listAllForHierarchy();
    }

    @PutMapping("/{id}")
    public AssetResponse update(@PathVariable Long id, @Valid @RequestBody UpdateAssetRequest request) {
        return assetService.update(id, request);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable Long id) {
        assetService.delete(id);
    }

    @GetMapping("/{id}/work-orders")
    public List<WorkOrderResponse> getWorkOrderHistory(@PathVariable Long id) {
        return assetService.getWorkOrderHistory(id);
    }

    @GetMapping("/{id}/cost-summary")
    public AssetCostSummaryResponse getCostSummary(@PathVariable Long id) {
        return assetService.getCostSummary(id);
    }

    @GetMapping("/{id}/analytics")
    public AssetAnalyticsResponse getAnalytics(
            @PathVariable Long id,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) Instant start,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) Instant end) {
        return assetService.getAnalytics(id, start, end);
    }

    @GetMapping("/{id}/downtimes")
    public List<AssetDowntimeResponse> getDowntimes(@PathVariable Long id) {
        return assetService.getDowntimes(id);
    }

    /**
     * Habilita o deshabilita un medidor. Requiere permiso de ELIMINAR
     * medidores: ocultar uno afecta a todo el equipo.
     */
    /**
     * Por defecto NO devuelve los deshabilitados. La app movil, que no
     * envia el parametro, deja de verlos sin necesidad de recompilar.
     */
    @GetMapping("/meters")
    public List<MeterResponse> listAllMeters(
            @RequestParam(defaultValue = "false") boolean includeDisabled) {
        return assetService.listAllMeters(includeDisabled);
    }

    @GetMapping("/{id}/meters")
    public List<MeterResponse> getMeters(@PathVariable Long id) {
        return assetService.getMeters(id);
    }

    @PostMapping("/{id}/meters")
    @ResponseStatus(HttpStatus.CREATED)
    public MeterResponse createMeter(@PathVariable Long id, @Valid @RequestBody CreateMeterRequest request) {
        return assetService.createMeter(id, request);
    }

    @PostMapping("/meters/{meterId}/readings")
    public MeterResponse addReading(@PathVariable Long meterId, @Valid @RequestBody AddMeterReadingRequest request) {
        return assetService.addReading(meterId, request);
    }

    @GetMapping("/meters/{meterId}/triggers")
    public List<MeterTriggerResponse> getMeterTriggers(@PathVariable Long meterId) {
        return assetService.getMeterTriggers(meterId);
    }

    @PostMapping("/meters/{meterId}/triggers")
    @ResponseStatus(HttpStatus.CREATED)
    public MeterTriggerResponse createMeterTrigger(@PathVariable Long meterId, @Valid @RequestBody CreateMeterTriggerRequest request) {
        return assetService.createMeterTrigger(meterId, request);
    }

    @DeleteMapping("/meters/triggers/{triggerId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteMeterTrigger(@PathVariable Long triggerId) {
        assetService.deleteMeterTrigger(triggerId);
    }

    @GetMapping("/{id}/files")
    public List<FileResponse> getFiles(@PathVariable Long id) {
        return fileAttachmentService.listForAsset(id);
    }

    @PostMapping(value = "/{id}/files", consumes = "multipart/form-data")
    public FileResponse uploadFile(@PathVariable Long id, @RequestParam("file") MultipartFile file) {
        return fileAttachmentService.uploadForAsset(id, file);
    }
}
