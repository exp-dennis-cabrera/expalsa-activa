package com.tuempresa.cmms.controller;

import com.tuempresa.cmms.dto.request.CreateMeterRequest;
import com.tuempresa.cmms.dto.response.MeterResponse;
import com.tuempresa.cmms.service.AssetService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;
import java.util.Map;

/**
 * Igual que Atlas real: "Medidores" es su propio modulo de primer nivel
 * (/app/meters en el sidebar), no solo una pestana dentro de un Activo.
 * La creacion/lecturas/umbrales siguen viviendo en AssetService (ya que
 * un medidor siempre pertenece a un activo), pero el listado global y la
 * creacion standalone (con selector de Activo) viven aca, en su propia ruta.
 */
@RestController
@RequestMapping("/meters")
@RequiredArgsConstructor
public class MeterController {

    private final AssetService assetService;
    private final com.tuempresa.cmms.service.FileAttachmentService fileAttachmentService;

    @GetMapping
    public List<MeterResponse> list() {
        return assetService.listAllMeters();
    }

    /** Version resumida (solo id+nombre), igual que getMini() real -- para listas grandes/selectores. */
    @GetMapping("/mini")
    public List<Map<String, Object>> mini() {
        return assetService.listAllMeters().stream()
                .map(m -> Map.<String, Object>of("id", m.id(), "name", m.name()))
                .toList();
    }

    @GetMapping("/{id}")
    public MeterResponse getById(@PathVariable Long id) {
        return assetService.getMeterById(id);
    }

    /** Medidores de un activo especifico, igual que getByAsset() real. */
    @GetMapping("/asset/{id}")
    public List<MeterResponse> getByAsset(@PathVariable Long id) {
        return assetService.listAllMeters().stream().filter(m -> id.equals(m.assetId())).toList();
    }

    /**
     * Igual alcance que POST /meters/search real: busqueda con filtros.
     * El real usa un sistema generico de SearchCriteria/FilterField (motor
     * de filtros dinamico); nosotros lo adaptamos a los filtros concretos
     * que tiene sentido ofrecer aca (texto, activo, ubicacion, solo vencidas).
     */
    /**
     * Busqueda con filtros y PAGINADA: con 200 medidores en dos plantas, no
     * tiene sentido devolverlos todos de golpe. El buscador tambien mira el
     * activo y la ubicacion, no solo el nombre -- asi "Comedor" encuentra
     * los medidores del comedor aunque no lo digan en su nombre.
     */
    @PostMapping("/search")
    public com.tuempresa.cmms.dto.response.PageResponse<MeterResponse> search(
            @RequestBody com.tuempresa.cmms.dto.request.MeterSearchRequest criteria) {
        String texto = criteria.search() == null ? null : criteria.search().toLowerCase().trim();

        List<MeterResponse> filtrados = assetService.listAllMeters().stream()
                .filter(m -> texto == null || texto.isBlank()
                        || m.name().toLowerCase().contains(texto)
                        || (m.assetName() != null && m.assetName().toLowerCase().contains(texto))
                        || (m.locationName() != null && m.locationName().toLowerCase().contains(texto)))
                .filter(m -> criteria.assetId() == null || criteria.assetId().equals(m.assetId()))
                .filter(m -> criteria.locationId() == null || criteria.locationId().equals(m.locationId()))
                // Categoria: es lo que separa "Agua Dulce" de "Agua Clarificada".
                .filter(m -> criteria.categoryId() == null || criteria.categoryId().equals(m.categoryId()))
                .filter(m -> criteria.pastDueOnly() == null || !criteria.pastDueOnly() || Boolean.TRUE.equals(m.pastDue()))
                // Los deshabilitados se ocultan salvo que se pidan.
                .filter(m -> Boolean.TRUE.equals(criteria.includeDisabled()) || !Boolean.TRUE.equals(m.disabled()))
                .toList();

        int page = criteria.page() != null ? criteria.page() : 0;
        int size = criteria.size() != null ? criteria.size() : 20;
        int desde = Math.min(page * size, filtrados.size());
        int hasta = Math.min(desde + size, filtrados.size());
        List<MeterResponse> pagina = filtrados.subList(desde, hasta);
        int totalPaginas = (int) Math.ceil((double) filtrados.size() / size);

        return new com.tuempresa.cmms.dto.response.PageResponse<>(
                pagina, page, size, filtrados.size(), totalPaginas, hasta >= filtrados.size());
    }

    @PostMapping(value = "/{id}/image", consumes = "multipart/form-data")
    public MeterResponse uploadImage(@PathVariable Long id, @RequestParam("file") MultipartFile file) {
        fileAttachmentService.uploadForMeter(id, file);
        return assetService.getMeterById(id);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public MeterResponse create(@Valid @RequestBody CreateMeterRequest request, @RequestParam Long assetId) {
        return assetService.createMeter(assetId, request);
    }

    @PatchMapping("/{id}")
    public MeterResponse update(@PathVariable Long id, @Valid @RequestBody CreateMeterRequest request) {
        return assetService.updateMeter(id, request);
    }

    @DeleteMapping("/{id}")
    @org.springframework.web.bind.annotation.ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable Long id) {
        assetService.deleteMeter(id);
    }

    /** Igual que GET /readings/meter/{id} real: las lecturas de un medidor. */
    @GetMapping("/{id}/readings")
    public List<MeterResponse.MeterReadingResponse> readings(@PathVariable Long id) {
        return assetService.getMeterById(id).readings();
    }

    /**
     * Igual que POST /readings/meter/{id}/histogram real: puntos para
     * graficar la tendencia de un medidor en un rango de fechas.
     */
    @PostMapping("/{id}/readings/histogram")
    public List<com.tuempresa.cmms.dto.response.ReadingHistogramResponse> histogram(
            @PathVariable Long id,
            @RequestBody com.tuempresa.cmms.dto.request.DateRangeRequest rango) {
        if (rango.start() == null || rango.end() == null) {
            throw new IllegalArgumentException("Se requieren las fechas de inicio y fin.");
        }
        if (rango.start().isAfter(rango.end())) {
            throw new IllegalArgumentException("La fecha de inicio debe ser anterior a la de fin.");
        }
        return assetService.getReadingHistogram(id, rango.start(), rango.end());
    }

    @PutMapping("/readings/{readingId}")
    public MeterResponse updateReading(@PathVariable Long readingId, @Valid @RequestBody com.tuempresa.cmms.dto.request.AddMeterReadingRequest request) {
        return assetService.updateReading(readingId, request);
    }

    @DeleteMapping("/readings/{readingId}")
    @org.springframework.web.bind.annotation.ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteReading(@PathVariable Long readingId) {
        assetService.deleteReading(readingId);
    }

    @PutMapping("/triggers/{triggerId}")
    public com.tuempresa.cmms.dto.response.MeterTriggerResponse updateTrigger(
            @PathVariable Long triggerId, @Valid @RequestBody com.tuempresa.cmms.dto.request.CreateMeterTriggerRequest request) {
        return assetService.updateMeterTrigger(triggerId, request);
    }

    /** Reporte de estado de medicion: todas las lecturas con quien y cuando. */
    @GetMapping("/readings/export")
    public org.springframework.http.ResponseEntity<byte[]> exportReadings() {
        return com.tuempresa.cmms.util.CsvResponse.of(
                assetService.exportMeterReadingsCsv(), "lecturas-medidores.csv");
    }

    @GetMapping("/export")
    public ResponseEntity<byte[]> export() {
        return com.tuempresa.cmms.util.CsvResponse.of(assetService.exportMetersCsv(), "medidores.csv");
    }

    @PostMapping(value = "/import", consumes = "multipart/form-data")
    public Map<String, Integer> importCsv(@RequestParam("file") MultipartFile file) {
        return assetService.importMetersCsv(file);
    }

    /**
     * Registra el reemplazo del equipo fisico de un medidor.
     *
     * El contador nuevo arranca en cero, pero el acumulado del medidor
     * sigue: el equipo entrante hereda como arrastre lo que acumulo el
     * anterior. Requiere permiso de eliminar medidores -- lo autoriza un
     * supervisor, no el tecnico.
     */
    /** Historial de equipos fisicos. Alimenta la pestaña "Reemplazos". */
    @GetMapping("/{meterId}/devices")
    public java.util.List<com.tuempresa.cmms.dto.response.MeterDeviceResponse> devices(
            @PathVariable Long meterId) {
        return assetService.listMeterDevices(meterId);
    }

    @PostMapping("/{meterId}/replace-device")
    public com.tuempresa.cmms.dto.response.MeterResponse replaceMeterDevice(
            @PathVariable Long meterId,
            @RequestParam(required = false) String serialNumber,
            @RequestParam(required = false) String notes) {
        return assetService.replaceMeterDevice(meterId, serialNumber, notes);
    }

    @PatchMapping("/{meterId}/disabled")
    public com.tuempresa.cmms.dto.response.MeterResponse setMeterDisabled(
            @PathVariable Long meterId,
            @RequestParam boolean disabled) {
        return assetService.setMeterDisabled(meterId, disabled);
    }

}
