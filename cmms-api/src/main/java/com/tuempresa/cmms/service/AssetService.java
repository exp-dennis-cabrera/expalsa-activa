package com.tuempresa.cmms.service;

import com.tuempresa.cmms.dto.request.AddMeterReadingRequest;
import com.tuempresa.cmms.dto.request.CreateAssetRequest;
import com.tuempresa.cmms.dto.request.CreateMeterRequest;
import com.tuempresa.cmms.dto.request.CreateMeterTriggerRequest;
import com.tuempresa.cmms.dto.request.UpdateAssetRequest;
import com.tuempresa.cmms.dto.response.*;
import com.tuempresa.cmms.exception.ForbiddenOperationException;
import com.tuempresa.cmms.exception.ResourceNotFoundException;
import com.tuempresa.cmms.model.entity.*;
import com.tuempresa.cmms.model.enums.AssetStatus;
import com.tuempresa.cmms.model.enums.WorkOrderStatus;
import com.tuempresa.cmms.repository.*;
import com.tuempresa.cmms.security.CurrentUserProvider;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.*;
import java.util.stream.Collectors;

import static com.tuempresa.cmms.repository.spec.AssetSpecifications.*;

/**
 * Version ampliada, fiel al modelo real de Atlas: estado con 7 valores
 * (marcados como "realmente arriba/abajo"), depreciacion, medidores,
 * tiempos de inactividad (con tracking automatico al cambiar el estado),
 * relaciones a usuarios/equipos/contratistas/repuestos, y las analiticas
 * MTBF/MTTR/downtime/uptime/costo. Simplificacion honesta: sin "Customers"
 * (no existe esa entidad en nuestra app) y el calculo de MTBF/MTTR es una
 * version directa de la formula, no cacheada como el original.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class AssetService {

    private final AssetRepository assetRepository;
    private final com.tuempresa.cmms.repository.OrganizationRepository organizationRepository;
    private final LocationRepository locationRepository;
    private final PermissionService permissionService;
    private final com.tuempresa.cmms.repository.FileAttachmentRepository fileAttachmentRepository;
    private final com.tuempresa.cmms.service.storage.FileStorageService fileStorageService;
    private final CategoryRepository categoryRepository;
    private final UserRepository userRepository;
    private final TeamRepository teamRepository;
    private final VendorRepository vendorRepository;
    private final PartRepository partRepository;
    private final DeprecationRepository deprecationRepository;
    private final AssetDowntimeRepository assetDowntimeRepository;
    private final MeterRepository meterRepository;
    private final com.tuempresa.cmms.repository.MeterDeviceRepository meterDeviceRepository;
    private final MeterReadingRepository meterReadingRepository;
    private final MeterTriggerRepository meterTriggerRepository;
    private final WorkOrderRepository workOrderRepository;
    private final WorkOrderPartRepository workOrderPartRepository;
    private final WorkOrderAdditionalCostRepository workOrderAdditionalCostRepository;
    private final WorkOrderTimeLogRepository workOrderTimeLogRepository;
    private final WorkOrderService workOrderService;
    private final AssetStatusService assetStatusService;
    private final NotificationService notificationService;
    private final CurrentUserProvider currentUser;

    @Transactional
    public AssetResponse create(CreateAssetRequest request) {
        permissionService.requireCreate(com.tuempresa.cmms.model.enums.PermissionEntity.ASSETS);
        Asset asset = new Asset();
        asset.setOrganizationId(currentUser.organizationId());
        asset.setCustomId("A" + String.format("%06d", assetRepository.count() + 1));
        applyFields(asset, request.name(), request.description(), null, request.categoryId(),
                request.serialNumber(), request.model(), request.manufacturer(), request.power(), request.area(),
                request.barCode(), request.nfcId(), request.acquisitionDate(), request.acquisitionCost(),
                request.warrantyExpirationDate(), request.inServiceDate(), request.additionalInfos(),
                request.imageUrl(), request.locationId(), request.parentAssetId(), request.primaryUserId(),
                request.assignedUserIds(), request.teamIds(), request.vendorIds(), request.partIds());
        applyDeprecation(asset, request.deprecation());

        Asset saved = assetRepository.save(asset); // arranca en OPERATIONAL (default de la entidad)
        syncTeams(saved, request.teamIds()); // recien aqui el activo tiene id
        if (request.status() != null && request.status() != saved.getStatus()) {
            assetStatusService.changeStatus(saved, request.status()); // dispara downtime si corresponde
        }
        notifyNewlyAssigned(saved, java.util.Set.of()); // todos los asignados son "nuevos" en la creacion
        return toResponse(saved);
    }

    @Transactional(readOnly = true)
    public AssetResponse getById(Long id) {
        return toResponse(findOrThrow(id));
    }

    /** Para el escaner de la app movil: buscar un activo por su codigo de barras. */
    @Transactional(readOnly = true)
    public AssetResponse getByBarCode(String barCode) {
        Asset asset = assetRepository.findByBarCode(barCode)
                .orElseThrow(() -> new ResourceNotFoundException("Ningún activo tiene el código de barras: " + barCode));
        return toResponse(asset);
    }

    /** Para el escaner de la app movil: buscar un activo por su etiqueta NFC. */
    @Transactional(readOnly = true)
    public AssetResponse getByNfc(String nfcId) {
        Asset asset = assetRepository.findByNfcId(nfcId)
                .orElseThrow(() -> new ResourceNotFoundException("Ningún activo tiene la etiqueta NFC: " + nfcId));
        return toResponse(asset);
    }

    @Transactional(readOnly = true)
    public Page<AssetResponse> list(String status, Long locationId, String search, Pageable pageable) {
        Specification<Asset> spec = Specification
                .where(hasStatus(status))
                .and(hasLocationId(locationId))
                .and(nameContains(search));

        return assetRepository.findAll(spec, pageable).map(this::toResponse);
    }

    /** Vista jerarquica: todos los activos, para que el frontend arme el arbol padre/hijo. */
    /**
     * Copia fiel de findAssetChildren real: los hijos directos de un
     * activo, paginados. id = 0 devuelve la raiz (los que no tienen padre).
     */
    @Transactional(readOnly = true)
    public com.tuempresa.cmms.dto.response.PageResponse<AssetResponse> findAssetChildren(
            Long id, int page, int size) {
        permissionService.requireView(com.tuempresa.cmms.model.enums.PermissionEntity.ASSETS);
        var pageable = org.springframework.data.domain.PageRequest.of(page, size);
        var pagina = (id == null || id == 0L)
                ? assetRepository.findByParentAssetIsNull(pageable)
                : assetRepository.findByParentAssetId(id, pageable);
        return com.tuempresa.cmms.dto.response.PageResponse.from(pagina.map(this::toResponse));
    }

    @Transactional(readOnly = true)
    public List<AssetResponse> listAllForHierarchy() {
        return assetRepository.findAll().stream().map(this::toResponse).toList();
    }

    @Transactional
    public AssetResponse update(Long id, UpdateAssetRequest request) {
        Asset asset = findOrThrow(id);
        java.util.Set<Long> previousUserIds = asset.getAssignedUsers().stream().map(User::getId)
                .collect(java.util.stream.Collectors.toSet());
        if (!permissionService.hasEditPermission(com.tuempresa.cmms.model.enums.PermissionEntity.ASSETS,
                null, previousUserIds)) {
            throw new com.tuempresa.cmms.exception.ForbiddenOperationException("No tienes permiso para editar este activo.");
        }

        applyFields(asset, request.name(), request.description(), null, request.categoryId(),
                request.serialNumber(), request.model(), request.manufacturer(), request.power(), request.area(),
                request.barCode(), request.nfcId(), request.acquisitionDate(), request.acquisitionCost(),
                request.warrantyExpirationDate(), request.inServiceDate(), request.additionalInfos(),
                request.imageUrl(), request.locationId(), request.parentAssetId(), request.primaryUserId(),
                request.assignedUserIds(), request.teamIds(), request.vendorIds(), request.partIds());
        applyDeprecation(asset, request.deprecation());

        Asset saved = assetRepository.save(asset);
        if (request.status() != null) {
            assetStatusService.changeStatus(saved, request.status()); // abre/cierra downtime si cambio
        }
        notifyNewlyAssigned(saved, previousUserIds);
        return toResponse(saved);
    }

    /**
     * Igual que patchNotify/getNewUsersToNotify real de Atlas: solo avisa a
     * los usuarios que se acaban de agregar, no a los que ya estaban.
     */
    private void notifyNewlyAssigned(Asset asset, java.util.Set<Long> previousUserIds) {
        asset.getAssignedUsers().stream()
                .filter(u -> !previousUserIds.contains(u.getId()))
                .forEach(u -> notificationService.notifyUser(u, "ASSET", "Nueva asignación",
                        "Fuiste asignado al activo \"" + asset.getName() + "\".", asset.getId()));
    }

    @Transactional
    public void delete(Long id) {
        Asset asset = findOrThrow(id);
        if (!permissionService.hasDeletePermission(com.tuempresa.cmms.model.enums.PermissionEntity.ASSETS, null)) {
            throw new com.tuempresa.cmms.exception.ForbiddenOperationException("No tienes permiso para eliminar este activo.");
        }
        assetRepository.delete(asset);
    }

    // ---- costos e historial (ya existian) ----

    @Transactional(readOnly = true)
    public List<WorkOrderResponse> getWorkOrderHistory(Long assetId) {
        return workOrderRepository.findByAssetId(assetId).stream().map(workOrderService::toResponse).toList();
    }

    @Transactional(readOnly = true)
    public AssetCostSummaryResponse getCostSummary(Long assetId) {
        List<WorkOrder> workOrders = workOrderRepository.findByAssetId(assetId);

        double partsCost = 0, laborCost = 0, additionalCost = 0;
        int completedCount = 0;
        for (WorkOrder wo : workOrders) {
            if (wo.getStatus() == WorkOrderStatus.COMPLETED) completedCount++;
            partsCost += workOrderPartRepository.findByWorkOrderId(wo.getId()).stream()
                    .mapToDouble(p -> (p.getUnitCostSnapshot() != null ? p.getUnitCostSnapshot() : 0) * p.getQuantityUsed())
                    .sum();
            additionalCost += workOrderAdditionalCostRepository.findByWorkOrderId(wo.getId()).stream()
                    .mapToDouble(c -> c.getCost() != null ? c.getCost() : 0)
                    .sum();
            laborCost += workOrderTimeLogRepository.findByWorkOrderId(wo.getId()).stream()
                    .mapToDouble(t -> (t.getHourlyRateSnapshot() != null ? t.getHourlyRateSnapshot() : 0)
                            * (t.getHours() != null ? t.getHours() : 0))
                    .sum();
        }
        double total = partsCost + additionalCost + laborCost;
        return new AssetCostSummaryResponse(laborCost, partsCost, additionalCost, total, workOrders.size(), completedCount);
    }

    // ---- analitica: MTBF / MTTR / downtime / uptime ----

    @Transactional(readOnly = true)
    public AssetAnalyticsResponse getAnalytics(Long assetId, Instant start, Instant end) {
        Asset asset = findOrThrow(assetId);
        List<AssetDowntime> downtimes = assetDowntimeRepository.findByAssetIdOrderByStartsOnDesc(assetId).stream()
                .filter(d -> d.getStartsOn() != null && !d.getStartsOn().isAfter(end)
                        && (d.getEndsOn() == null || !d.getEndsOn().isBefore(start)))
                .toList();

        long downtimeSeconds = downtimes.stream()
                .mapToLong(d -> {
                    Instant dStart = d.getStartsOn().isBefore(start) ? start : d.getStartsOn();
                    Instant dEnd = d.getEndsOn() == null || d.getEndsOn().isAfter(end) ? end : d.getEndsOn();
                    return Math.max(0, ChronoUnit.SECONDS.between(dStart, dEnd));
                }).sum();

        long totalRangeSeconds = Math.max(1, ChronoUnit.SECONDS.between(start, end));
        long uptimeSeconds = Math.max(0, totalRangeSeconds - downtimeSeconds);

        // MTTR = promedio de duracion de cada falla (tiempo medio de reparacion)
        double mttrHours = downtimes.isEmpty() ? 0 :
                downtimes.stream().mapToLong(d -> d.getDurationSeconds() != null ? d.getDurationSeconds() : 0).average().orElse(0) / 3600.0;

        // MTBF = tiempo de actividad / numero de fallas (tiempo medio entre fallas)
        double mtbfHours = downtimes.isEmpty() ? uptimeSeconds / 3600.0 : (uptimeSeconds / (double) downtimes.size()) / 3600.0;

        double totalCost = getCostSummary(assetId).totalCost();

        return new AssetAnalyticsResponse(mtbfHours, mttrHours, downtimeSeconds / 3600.0, uptimeSeconds / 3600.0, totalCost);
    }

    @Transactional(readOnly = true)
    public List<AssetDowntimeResponse> getDowntimes(Long assetId) {
        return assetDowntimeRepository.findByAssetIdOrderByStartsOnDesc(assetId).stream()
                .map(d -> new AssetDowntimeResponse(d.getId(), d.getStartsOn(), d.getEndsOn(), d.getDurationSeconds()))
                .toList();
    }

    // ---- medidores ----

    @Transactional
    public MeterResponse createMeter(Long assetId, CreateMeterRequest request) {
        permissionService.requireCreate(com.tuempresa.cmms.model.enums.PermissionEntity.METERS);
        Asset asset = findOrThrow(assetId);
        Meter meter = new Meter();
        meter.setOrganizationId(currentUser.organizationId());
        meter.setAsset(asset);
        meter.setName(request.name());
        meter.setUnit(request.unit());
        meter.setUpdateFrequencyDays(request.updateFrequencyDays() != null ? request.updateFrequencyDays() : 30);
        // Equipo responsable: define quien ve el medidor en el listado.
        meter.setTeam(request.teamId() != null
                ? teamRepository.findById(request.teamId()).orElse(null)
                : null);
        meter.setCategory(request.categoryId() != null ? categoryRepository.findById(request.categoryId()).orElse(null) : null);
        meter.setLocation(request.locationId() != null ? locationRepository.findById(request.locationId()).orElse(null) : null);
        meter.setCreatedBy(userRepository.findById(currentUser.userId()).orElse(null));
        meter.setAssignedUsers(request.assignedUserIds() != null && !request.assignedUserIds().isEmpty()
                ? new java.util.HashSet<>(userRepository.findAllById(request.assignedUserIds())) : new java.util.HashSet<>());
        Meter saved = meterRepository.save(meter);
        // Igual que MeterService.notify() real: avisa a todos los asignados (todos son "nuevos" al crear).
        saved.getAssignedUsers().forEach(u ->
                notificationService.notifyUser(u, "METER", "Nueva asignación",
                        "Fuiste asignado al medidor \"" + saved.getName() + "\".", saved.getId()));
        return toMeterResponse(saved);
    }

    /** Listado independiente de TODOS los medidores (modulo propio, no anidado en un activo). */
    @Transactional(readOnly = true)
    public List<MeterResponse> listAllMeters() {
        return listAllMeters(false);
    }

    /**
     * incluirDeshabilitados = false por defecto: el listado normal no los
     * muestra. Asi la app movil, que no tiene ese interruptor, deja de
     * verlos sin necesidad de recompilar.
     */
    @Transactional(readOnly = true)
    public List<MeterResponse> listAllMeters(boolean incluirDeshabilitados) {
        // Orden alfabetico por nombre, ignorando mayusculas y tildes: con
        // 200 medidores, un orden estable hace la lista mucho mas facil de
        // recorrer. Se ordena aca para que valga igual en web y en movil.
        return meterRepository.findAll().stream()
                .filter(m -> incluirDeshabilitados || !Boolean.TRUE.equals(m.getDisabled()))
                .filter(this::leCompeteMedidor)
                .map(this::toMeterResponse)
                .sorted(java.util.Comparator.comparing(
                        MeterResponse::name,
                        java.text.Collator.getInstance(new java.util.Locale("es"))))
                .toList();
    }

    /**
     * Quien ve un medidor:
     *   - Quien tiene permiso de "ver de otros" sobre medidores (jefe de
     *     mantenimiento, administrador): ve todos.
     *   - Los integrantes del equipo responsable.
     *   - Quien este asignado directamente.
     *   - Si el medidor NO tiene equipo, lo ve todo el mundo. Asi los
     *     medidores existentes no desaparecen al desplegar esto.
     */
    private boolean leCompeteMedidor(Meter meter) {
        if (permissionService.hasViewOtherPermission(
                com.tuempresa.cmms.model.enums.PermissionEntity.METERS)) {
            return true;
        }
        if (meter.getTeam() == null) return true;

        Long userId = currentUser.userId();
        boolean asignado = meter.getAssignedUsers().stream()
                .anyMatch(u -> u.getId().equals(userId));
        if (asignado) return true;

        return teamRepository.findByMembers_Id(userId).stream()
                .anyMatch(t -> t.getId().equals(meter.getTeam().getId()));
    }

    /**
     * Guardian para las operaciones sobre un medidor concreto: leerlo,
     * registrar lectura, editarlo. Sin esto, un tecnico podia registrar
     * lecturas de un medidor de otra area conociendo su id.
     */
    private void requireAccesoMedidor(Meter meter) {
        if (!leCompeteMedidor(meter)) {
            throw new com.tuempresa.cmms.exception.ForbiddenOperationException(
                    "Este medidor no corresponde a tu equipo.");
        }
    }

    /**
     * Habilita o deshabilita un medidor.
     *
     * Requiere permiso de ELIMINAR medidores, no solo de editar: ocultar un
     * medidor afecta a todo el equipo, asi que no deberia poder hacerlo
     * cualquiera que pueda corregir un nombre.
     */
    @Transactional
    public MeterResponse setMeterDisabled(Long meterId, boolean disabled) {
        Meter meter = meterRepository.findById(meterId)
                .orElseThrow(() -> new ResourceNotFoundException("Medidor no encontrado: id=" + meterId));
        if (!permissionService.hasDeletePermission(
                com.tuempresa.cmms.model.enums.PermissionEntity.METERS,
                meter.getCreatedBy() != null ? meter.getCreatedBy().getId() : null)) {
            throw new com.tuempresa.cmms.exception.ForbiddenOperationException(
                    "No tienes permiso para deshabilitar medidores.");
        }
        meter.setDisabled(disabled);
        return toMeterResponse(meterRepository.save(meter));
    }

    /**
     * Reemplaza el equipo fisico de un medidor.
     *
     * El contador nuevo arranca en cero, pero el consumo acumulado del
     * medidor NO debe reiniciarse: el equipo entrante hereda como arrastre
     * (offset) el acumulado del que sale.
     *
     *     acumulado real = offset + lectura fisica
     *
     * Requiere permiso de ELIMINAR medidores: un arrastre mal puesto
     * desplaza todo el historico de consumo del activo, y el error es
     * dificil de detectar despues. Por eso lo autoriza un supervisor, no
     * el tecnico que toma la lectura.
     */
    @Transactional
    public MeterResponse replaceMeterDevice(Long meterId, String serialNumber, String notes) {
        Meter meter = meterRepository.findById(meterId)
                .orElseThrow(() -> new ResourceNotFoundException("Medidor no encontrado: id=" + meterId));
        if (!permissionService.hasDeletePermission(
                com.tuempresa.cmms.model.enums.PermissionEntity.METERS,
                meter.getCreatedBy() != null ? meter.getCreatedBy().getId() : null)) {
            throw new com.tuempresa.cmms.exception.ForbiddenOperationException(
                    "Solo un supervisor puede registrar el reemplazo de un medidor.");
        }

        var ahora = java.time.Instant.now();
        var actual = meterDeviceRepository.findByMeterIdAndRemovedAtIsNull(meterId);

        // El arrastre del equipo entrante es el acumulado del que sale:
        // su propio arrastre mas la ultima lectura fisica que dio.
        double arrastre = 0.0;
        if (actual.isPresent()) {
            MeterDevice saliente = actual.get();
            double ultimaFisica = meterReadingRepository
                    .findByMeterIdOrderByReadingDateDesc(meterId).stream()
                    .findFirst()
                    .map(MeterReading::getValue)
                    .orElse(0.0);
            arrastre = saliente.getOffsetValue() + ultimaFisica;
            saliente.setRemovedAt(ahora);
            // saveAndFlush, no save: Hibernate agrupa las escrituras y
            // ejecutaba el INSERT del equipo nuevo ANTES del UPDATE que
            // retira el anterior, chocando con el indice que exige un solo
            // equipo activo por medidor. El flush obliga a que el retiro se
            // escriba primero.
            meterDeviceRepository.saveAndFlush(saliente);
        }

        MeterDevice entrante = new MeterDevice();
        entrante.setOrganizationId(meter.getOrganizationId());
        entrante.setMeter(meter);
        entrante.setSerialNumber(serialNumber);
        entrante.setOffsetValue(arrastre);
        entrante.setInstalledAt(ahora);
        entrante.setNotes(notes);
        userRepository.findById(currentUser.userId()).ifPresent(entrante::setReplacedBy);
        meterDeviceRepository.save(entrante);

        return toMeterResponse(meter);
    }

    /**
     * Historial de equipos fisicos de un medidor, del mas antiguo al actual.
     *
     * Alimenta la pestaña "Reemplazos": muestra que contador estuvo
     * instalado en cada periodo, cuanto arrastre heredo, quien autorizo el
     * cambio y por que.
     */
    @Transactional(readOnly = true)
    public java.util.List<com.tuempresa.cmms.dto.response.MeterDeviceResponse> listMeterDevices(Long meterId) {
        Meter meter = meterRepository.findById(meterId)
                .orElseThrow(() -> new ResourceNotFoundException("Medidor no encontrado: id=" + meterId));
        requireAccesoMedidor(meter);

        return meterDeviceRepository.findByMeterIdOrderByInstalledAtAsc(meterId).stream()
                .map(d -> new com.tuempresa.cmms.dto.response.MeterDeviceResponse(
                        d.getId(),
                        d.getSerialNumber(),
                        d.getOffsetValue(),
                        d.getInstalledAt(),
                        d.getRemovedAt(),
                        d.getReplacedBy() != null ? fullName(d.getReplacedBy()) : null,
                        d.getNotes(),
                        meterReadingRepository.countByDeviceId(d.getId())))
                .toList();
    }

    @Transactional(readOnly = true)
    public MeterResponse getMeterById(Long id) {
        Meter meter = meterRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Medidor no encontrado: id=" + id));
        requireAccesoMedidor(meter);
        return toMeterResponse(meter);
    }

    /**
     * Reporte de estado de medicion: una fila por LECTURA, con el medidor,
     * su activo y ubicacion, el valor, cuando se tomo, cuando se registro
     * en el sistema y quien la registro.
     *
     * La diferencia entre "fecha de medicion" y "fecha de registro" es
     * justamente lo que permite auditar: si alguien tomo la lectura a las
     * 6 AM pero la cargo a las 4 PM, aca se ve.
     *
     * Los medidores SIN ninguna lectura tambien aparecen, con el valor
     * vacio -- son los que hay que perseguir.
     */
    /** Exportacion de activos a CSV, igual que la opcion "Exportar" del menu real. */
    /**
     * Repuestos asociados a un activo. Alimenta la pestaña "Repuestos" del
     * detalle, igual que AssetParts.tsx real.
     */
    @Transactional(readOnly = true)
    public java.util.List<com.tuempresa.cmms.dto.response.PartSummary> listParts(Long assetId) {
        permissionService.requireView(com.tuempresa.cmms.model.enums.PermissionEntity.ASSETS);
        Asset asset = assetRepository.findById(assetId)
                .orElseThrow(() -> new ResourceNotFoundException("Activo no encontrado: id=" + assetId));
        return asset.getParts().stream()
                .map(p -> new com.tuempresa.cmms.dto.response.PartSummary(
                        p.getId(), p.getName(), p.getErpSku(), p.getQuantity(), p.getCost()))
                .toList();
    }

    @Transactional(readOnly = true)
    public String exportAssetsCsv() {
        permissionService.requireView(com.tuempresa.cmms.model.enums.PermissionEntity.ASSETS);
        StringBuilder sb = new StringBuilder(
                "id,nombre,estado,ubicacion,area,modelo,codigo_barras,categoria,"
                + "descripcion,usuario_principal,activo_padre,fecha_creacion\n");
        for (Asset a : assetRepository.findAll()) {
            sb.append(csvAsset(a.getCustomId())).append(',')
              .append(csvAsset(a.getName())).append(',')
              .append(csvAsset(a.getStatus() != null ? a.getStatus().name() : null)).append(',')
              .append(csvAsset(a.getLocation() != null ? a.getLocation().getName() : null)).append(',')
              .append(csvAsset(a.getArea())).append(',')
              .append(csvAsset(a.getModel())).append(',')
              .append(csvAsset(a.getBarCode())).append(',')
              .append(csvAsset(a.getCategory() != null ? a.getCategory().getName() : null)).append(',')
              .append(csvAsset(a.getDescription())).append(',')
              .append(csvAsset(a.getPrimaryUser() != null
                      ? a.getPrimaryUser().getFirstName() + " " + a.getPrimaryUser().getLastName() : null)).append(',')
              .append(csvAsset(a.getParentAsset() != null ? a.getParentAsset().getName() : null)).append(',')
              .append(csvAsset(a.getCreatedAt())).append('\n');
        }
        return sb.toString();
    }

    /** Escapa un valor para CSV. */
    private String csvAsset(Object valor) {
        if (valor == null) return "";
        String s = valor.toString();
        if (s.contains(",") || s.contains("\"") || s.contains("\n")) {
            return "\"" + s.replace("\"", "\"\"") + "\"";
        }
        return s;
    }

    @Transactional(readOnly = true)
    public String exportMeterReadingsCsv() {
        // Las horas del reporte van en la zona de la organizacion. Con la
        // del servidor (UTC) saldrian 5 horas adelantadas, y una lectura
        // tomada a las 02:00 apareceria como 07:00.
        var formato = java.time.format.DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm")
                .withZone(zonaOrganizacion());
        StringBuilder sb = new StringBuilder(
                "medidor,unidad,activo,ubicacion,frecuencia_dias,valor,fecha_medicion,fecha_registro,registrado_por,estado\n");

        for (Meter m : meterRepository.findAll()) {
            var lecturas = meterReadingRepository.findByMeterIdOrderByReadingDateDesc(m.getId());
            String base = csvEscape(m.getName()) + ',' + csvEscape(m.getUnit()) + ','
                    + csvEscape(m.getAsset() != null ? m.getAsset().getName() : "") + ','
                    + csvEscape(m.getLocation() != null ? m.getLocation().getName() : "") + ','
                    + m.getUpdateFrequencyDays() + ',';

            if (lecturas.isEmpty()) {
                sb.append(base).append(",,,").append("SIN LECTURAS").append("\n");
                continue;
            }
            for (var lectura : lecturas) {
                sb.append(base)
                        .append(lectura.getValue()).append(',')
                        .append(formato.format(lectura.getReadingDate())).append(',')
                        .append(lectura.getCreatedAt() != null ? formato.format(lectura.getCreatedAt()) : "").append(',')
                        .append(csvEscape(lectura.getCreatedBy() != null ? fullName(lectura.getCreatedBy()) : "")).append(',')
                        .append("OK")
                        .append("\n");
            }
        }
        return sb.toString();
    }

    /**
     * Copia fiel de getHistogramData real: agrupa las lecturas de un rango
     * en como maximo 30 puntos, promediando las de cada periodo. Sirve para
     * graficar la tendencia sin saturar el grafico cuando hay meses de datos.
     */
    @Transactional(readOnly = true)
    public java.util.List<com.tuempresa.cmms.dto.response.ReadingHistogramResponse> getReadingHistogram(
            Long meterId, java.time.Instant start, java.time.Instant end) {
        var lecturas = meterReadingRepository.findByMeterIdOrderByReadingDateDesc(meterId).stream()
                .filter(r -> !r.getReadingDate().isBefore(start) && !r.getReadingDate().isAfter(end))
                .sorted(java.util.Comparator.comparing(MeterReading::getReadingDate))
                .toList();
        if (lecturas.isEmpty()) return java.util.List.of();

        long totalDias = java.time.Duration.between(start, end).toDays() + 1;
        int maxPuntos = 30;
        int diasPorGrupo = (int) Math.max(1, Math.ceil((double) totalDias / maxPuntos));

        var resultado = new java.util.ArrayList<com.tuempresa.cmms.dto.response.ReadingHistogramResponse>();
        java.time.Instant inicioGrupo = start;

        while (!inicioGrupo.isAfter(end)) {
            java.time.Instant finGrupo = inicioGrupo.plus(diasPorGrupo, java.time.temporal.ChronoUnit.DAYS)
                    .minusMillis(1);
            if (finGrupo.isAfter(end)) finGrupo = end;

            final java.time.Instant desde = inicioGrupo;
            final java.time.Instant hasta = finGrupo;
            var grupo = lecturas.stream()
                    .filter(r -> !r.getReadingDate().isBefore(desde) && !r.getReadingDate().isAfter(hasta))
                    .toList();

            if (!grupo.isEmpty()) {
                double promedio = grupo.stream().mapToDouble(MeterReading::getValue).average().orElse(0);
                java.time.Instant medio = java.time.Instant.ofEpochMilli(
                        (desde.toEpochMilli() + hasta.toEpochMilli()) / 2);
                resultado.add(new com.tuempresa.cmms.dto.response.ReadingHistogramResponse(
                        medio, Math.round(promedio * 100.0) / 100.0, grupo.size()));
            }
            inicioGrupo = inicioGrupo.plus(diasPorGrupo, java.time.temporal.ChronoUnit.DAYS);
        }
        return resultado;
    }

    private static final String METER_CSV_HEADER = "name,unit,updateFrequencyDays,assetCustomId";

    @Transactional(readOnly = true)
    public String exportMetersCsv() {
        StringBuilder sb = new StringBuilder(METER_CSV_HEADER).append("\n");
        for (Meter m : meterRepository.findAll()) {
            sb.append(csvEscape(m.getName())).append(',')
                    .append(csvEscape(m.getUnit())).append(',')
                    .append(m.getUpdateFrequencyDays()).append(',')
                    .append(csvEscape(m.getAsset() != null ? m.getAsset().getCustomId() : ""))
                    .append("\n");
        }
        return sb.toString();
    }

    @Transactional
    public java.util.Map<String, Integer> importMetersCsv(org.springframework.web.multipart.MultipartFile file) {
        int created = 0, failed = 0;
        try (var reader = new java.io.BufferedReader(new java.io.InputStreamReader(file.getInputStream()))) {
            String line = reader.readLine(); // header
            while ((line = reader.readLine()) != null) {
                if (line.isBlank()) continue;
                try {
                    String[] cols = line.split(",", -1);
                    Asset asset = assetRepository.findAll().stream()
                            .filter(a -> cols[3].equals(a.getCustomId())).findFirst()
                            .orElseThrow(() -> new IllegalArgumentException("Activo no encontrado: " + cols[3]));
                    Meter meter = new Meter();
                    meter.setOrganizationId(currentUser.organizationId());
                    meter.setName(cols[0]);
                    meter.setUnit(cols.length > 1 && !cols[1].isBlank() ? cols[1] : null);
                    meter.setUpdateFrequencyDays(cols.length > 2 && !cols[2].isBlank() ? Integer.parseInt(cols[2]) : 30);
                    meter.setAsset(asset);
                    meterRepository.save(meter);
                    created++;
                } catch (Exception e) {
                    failed++;
                }
            }
        } catch (Exception e) {
            log.error("Error leyendo el CSV de importacion de medidores", e);
        }
        return java.util.Map.of("created", created, "failed", failed);
    }

    private String csvEscape(String value) {
        if (value == null) return "";
        if (value.contains(",") || value.contains("\"") || value.contains("\n")) {
            return "\"" + value.replace("\"", "\"\"") + "\"";
        }
        return value;
    }

    @Transactional(readOnly = true)
    public List<MeterResponse> getMeters(Long assetId) {
        return meterRepository.findByAssetId(assetId).stream().map(this::toMeterResponse).toList();
    }

    @Transactional
    public MeterResponse updateMeter(Long meterId, CreateMeterRequest request) {
        Meter meter = meterRepository.findById(meterId)
                .orElseThrow(() -> new ResourceNotFoundException("Medidor no encontrado: id=" + meterId));
        requireAccesoMedidor(meter);
        java.util.Set<Long> previousUserIds = meter.getAssignedUsers().stream().map(User::getId)
                .collect(java.util.stream.Collectors.toSet());
        if (!permissionService.hasEditPermission(com.tuempresa.cmms.model.enums.PermissionEntity.METERS,
                meter.getCreatedBy() != null ? meter.getCreatedBy().getId() : null, previousUserIds)) {
            throw new com.tuempresa.cmms.exception.ForbiddenOperationException("No tienes permiso para editar este medidor.");
        }

        meter.setName(request.name());
        meter.setUnit(request.unit());
        meter.setUpdateFrequencyDays(request.updateFrequencyDays() != null ? request.updateFrequencyDays() : 30);
        // Equipo responsable: define quien ve el medidor en el listado.
        meter.setTeam(request.teamId() != null
                ? teamRepository.findById(request.teamId()).orElse(null)
                : null);
        meter.setCategory(request.categoryId() != null ? categoryRepository.findById(request.categoryId()).orElse(null) : null);
        meter.setLocation(request.locationId() != null ? locationRepository.findById(request.locationId()).orElse(null) : null);
        meter.setAssignedUsers(request.assignedUserIds() != null && !request.assignedUserIds().isEmpty()
                ? new java.util.HashSet<>(userRepository.findAllById(request.assignedUserIds())) : new java.util.HashSet<>());
        Meter saved = meterRepository.save(meter);

        // Igual que MeterService.patchNotify() real: solo avisa a los recien agregados.
        saved.getAssignedUsers().stream()
                .filter(u -> !previousUserIds.contains(u.getId()))
                .forEach(u -> notificationService.notifyUser(u, "METER", "Nueva asignación",
                        "Fuiste asignado al medidor \"" + saved.getName() + "\".", saved.getId()));
        return toMeterResponse(saved);
    }

    @Transactional
    public void deleteMeter(Long meterId) {
        Meter meter = meterRepository.findById(meterId)
                .orElseThrow(() -> new ResourceNotFoundException("Medidor no encontrado: id=" + meterId));
        requireAccesoMedidor(meter);
        if (!permissionService.hasDeletePermission(com.tuempresa.cmms.model.enums.PermissionEntity.METERS,
                meter.getCreatedBy() != null ? meter.getCreatedBy().getId() : null)) {
            throw new com.tuempresa.cmms.exception.ForbiddenOperationException("No tienes permiso para eliminar este medidor.");
        }
        meterRepository.deleteById(meterId);
    }

    /**
     * Las lecturas se guardan con UN decimal: es la precision que se usa en
     * planta, y evita que un error de tipeo meta un 45.23847 que despues
     * ensucia promedios y graficos.
     */
    private Double redondearLectura(Double valor) {
        return valor == null ? null : Math.round(valor * 10.0) / 10.0;
    }

    /**
     * Corregir o borrar una lectura reescribe el historico de consumo: el
     * valor de un dia cambia y con el todos los calculos que dependen de
     * el. Por eso exige permiso de ELIMINAR medidores, no el de registrar
     * lecturas -- lo hace un supervisor, no el tecnico que la tomo.
     */
    private void requirePermisoEditarLectura(MeterReading reading) {
        Meter meter = reading.getMeter();
        requireAccesoMedidor(meter);
        if (!permissionService.hasDeletePermission(
                com.tuempresa.cmms.model.enums.PermissionEntity.METERS,
                meter.getCreatedBy() != null ? meter.getCreatedBy().getId() : null)) {
            throw new com.tuempresa.cmms.exception.ForbiddenOperationException(
                    "Solo un supervisor puede corregir o eliminar lecturas.");
        }
    }

    @Transactional
    public MeterResponse updateReading(Long readingId, AddMeterReadingRequest request) {
        MeterReading reading = meterReadingRepository.findById(readingId)
                .orElseThrow(() -> new ResourceNotFoundException("Lectura no encontrada: id=" + readingId));
        requirePermisoEditarLectura(reading);
        reading.setValue(redondearLectura(request.value()));
        meterReadingRepository.save(reading);
        return toMeterResponse(reading.getMeter());
    }

    @Transactional
    public void deleteReading(Long readingId) {
        MeterReading reading = meterReadingRepository.findById(readingId)
                .orElseThrow(() -> new ResourceNotFoundException("Lectura no encontrada: id=" + readingId));
        requirePermisoEditarLectura(reading);
        meterReadingRepository.delete(reading);
    }

    @Transactional
    public MeterTriggerResponse updateMeterTrigger(Long triggerId, CreateMeterTriggerRequest request) {
        MeterTrigger trigger = meterTriggerRepository.findById(triggerId)
                .orElseThrow(() -> new ResourceNotFoundException("Umbral no encontrado: id=" + triggerId));
        applyTriggerFields(trigger, request);
        return toTriggerResponse(meterTriggerRepository.save(trigger));
    }

    @Transactional
    public MeterResponse addReading(Long meterId, AddMeterReadingRequest request) {
        Meter meter = meterRepository.findById(meterId)
                .orElseThrow(() -> new ResourceNotFoundException("Medidor no encontrado: id=" + meterId));
        requireAccesoMedidor(meter);

        MeterReading ultima = meterReadingRepository
                .findByMeterIdOrderByReadingDateDesc(meterId).stream().findFirst().orElse(null);

        if (ultima != null) {
            // 1. FRECUENCIA -- copia fiel de la validacion real
            // (ReadingController.create): no se acepta otra lectura hasta
            // que venza el periodo. La interfaz ya oculta el boton, pero
            // sin esto la API acepta duplicados desde cualquier otro
            // origen (scripts, integraciones, un cliente desactualizado).
            java.time.ZoneId zona = zonaOrganizacion();
            java.time.LocalDate proxima = ultima.getReadingDate().atZone(zona).toLocalDate()
                    .plusDays(meter.getUpdateFrequencyDays() != null ? meter.getUpdateFrequencyDays() : 1);
            if (java.time.LocalDate.now(zona).isBefore(proxima)) {
                throw new com.tuempresa.cmms.exception.ForbiddenOperationException(
                        "Ya se registró una lectura para este período. La próxima corresponde el "
                                + proxima.format(java.time.format.DateTimeFormatter.ofPattern("dd/MM/yyyy")) + ".");
            }

            // 2. RETROCESO -- un contador acumulativo nunca baja. Si la
            // nueva lectura es menor que la anterior, es casi seguro un
            // error de digitacion (un digito de menos), y dejaria el
            // consumo del dia en negativo.
            //
            // Se compara solo entre lecturas del MISMO equipo fisico: tras
            // un reemplazo el contador arranca en cero, y eso no es un
            // retroceso sino un equipo nuevo.
            var equipoActual = meterDeviceRepository.findByMeterIdAndRemovedAtIsNull(meterId);
            boolean mismoEquipo = equipoActual.isEmpty() || ultima.getDevice() == null
                    || ultima.getDevice().getId().equals(equipoActual.get().getId());

            if (mismoEquipo && request.value() != null && ultima.getValue() != null
                    && request.value() < ultima.getValue()) {
                throw new com.tuempresa.cmms.exception.ForbiddenOperationException(
                        "La lectura (" + request.value() + ") es menor que la anterior ("
                                + ultima.getValue() + "). Revisa el valor: un contador no puede retroceder.");
            }
        }


        MeterReading reading = new MeterReading();
        reading.setOrganizationId(currentUser.organizationId());
        reading.setMeter(meter);
        reading.setValue(redondearLectura(request.value()));
        reading.setCreatedBy(userRepository.findById(currentUser.userId()).orElse(null));
        // Se guarda que equipo fisico dio la lectura, para poder rastrearlo
        // despues de un reemplazo.
        meterDeviceRepository.findByMeterIdAndRemovedAtIsNull(meterId).ifPresent(reading::setDevice);
        meterReadingRepository.save(reading);

        checkTriggers(meter, request.value());
        return toMeterResponse(meter);
    }

    /**
     * Igual que la logica real de ReadingController: si la lectura cruza el
     * umbral de un MeterTrigger, avisa a los usuarios asignados al medidor Y
     * genera automaticamente una orden de trabajo con la plantilla del trigger.
     */
    private void checkTriggers(Meter meter, double readingValue) {
        for (MeterTrigger trigger : meterTriggerRepository.findByMeterId(meter.getId())) {
            boolean crossed = trigger.getCondition() == com.tuempresa.cmms.model.enums.MeterTriggerCondition.LESS_THAN
                    ? readingValue < trigger.getValue()
                    : readingValue > trigger.getValue();
            if (!crossed) continue;

            // Evita generar una orden nueva por cada lectura mientras la
            // condicion se mantenga: espera waitBeforeDays desde el ultimo disparo.
            if (trigger.getLastTriggeredAt() != null && trigger.getWaitBeforeDays() != null && trigger.getWaitBeforeDays() > 0) {
                Instant nextAllowed = trigger.getLastTriggeredAt().plus(trigger.getWaitBeforeDays(), ChronoUnit.DAYS);
                if (Instant.now().isBefore(nextAllowed)) continue;
            }

            String conditionText = trigger.getCondition() == com.tuempresa.cmms.model.enums.MeterTriggerCondition.LESS_THAN ? "por debajo de" : "por encima de";
            String message = "El medidor \"" + meter.getName() + "\" registró " + readingValue
                    + " " + (meter.getUnit() != null ? meter.getUnit() : "") + ", " + conditionText + " el umbral de "
                    + trigger.getValue() + ". Se generó una orden de trabajo automáticamente.";
            meter.getAssignedUsers().forEach(u ->
                    notificationService.notifyUser(u, "METER", "Umbral de medidor alcanzado", message, meter.getId()));

            WorkOrder wo = new WorkOrder();
            wo.setOrganizationId(meter.getOrganizationId());
            wo.setTitle(trigger.getWorkOrderTitle());
            wo.setDescription(trigger.getWorkOrderDescription());
            wo.setPriority(trigger.getPriority() != null ? trigger.getPriority() : com.tuempresa.cmms.model.enums.WorkOrderPriority.MEDIUM);
            wo.setType(com.tuempresa.cmms.model.enums.WorkOrderType.PREVENTIVE);
            wo.setStatus(WorkOrderStatus.OPEN);
            wo.setCustomId("WO" + String.format("%06d", workOrderRepository.count() + 1));
            // Si el disparador tiene su propio Activo/Ubicacion/Equipo/Categoria
            // asignados, se usan esos; si no, se cae al activo del medidor
            // (comportamiento razonable ya que casi siempre coinciden).
            wo.setAsset(trigger.getAsset() != null ? trigger.getAsset() : meter.getAsset());
            wo.setLocation(trigger.getLocation());
            wo.setCategory(trigger.getCategory());
            wo.setTeam(trigger.getTeam());
            wo.setDueDate(trigger.getDueDate());
            wo.setEstimatedStartDate(trigger.getEstimatedStartDate());
            wo.setEstimatedDurationMinutes(trigger.getEstimatedDurationMinutes());
            wo.setPrimaryAssignee(trigger.getPrimaryAssignee());
            WorkOrder savedWo = workOrderRepository.save(wo);
            workOrderService.recordStatusHistory(savedWo, savedWo.getStatus());
            if (savedWo.getPrimaryAssignee() != null) {
                notificationService.notifyUser(savedWo.getPrimaryAssignee(), "WORK_ORDER_ASSIGNED",
                        "Nueva orden por umbral de medidor",
                        "\"" + savedWo.getTitle() + "\" se generó automáticamente y fue asignada a ti.", savedWo.getId());
            }

            trigger.setLastTriggeredAt(Instant.now());
            meterTriggerRepository.save(trigger);
        }
    }

    @Transactional
    public MeterTriggerResponse createMeterTrigger(Long meterId, CreateMeterTriggerRequest request) {
        Meter meter = meterRepository.findById(meterId)
                .orElseThrow(() -> new ResourceNotFoundException("Medidor no encontrado: id=" + meterId));
        requireAccesoMedidor(meter);
        MeterTrigger trigger = new MeterTrigger();
        trigger.setOrganizationId(currentUser.organizationId());
        trigger.setMeter(meter);
        applyTriggerFields(trigger, request);
        return toTriggerResponse(meterTriggerRepository.save(trigger));
    }

    /** Igual conjunto de campos que WorkOrderBase (name/condition/value son propios del disparador). */
    private void applyTriggerFields(MeterTrigger trigger, CreateMeterTriggerRequest request) {
        trigger.setName(request.name());
        trigger.setCondition(request.condition());
        trigger.setValue(request.value());
        trigger.setWorkOrderTitle(request.workOrderTitle());
        trigger.setWorkOrderDescription(request.workOrderDescription());
        trigger.setPriority(request.priority() != null ? request.priority() : com.tuempresa.cmms.model.enums.WorkOrderPriority.MEDIUM);
        trigger.setPrimaryAssignee(request.primaryAssigneeId() != null ? userRepository.findById(request.primaryAssigneeId()).orElse(null) : null);
        trigger.setWaitBeforeDays(request.waitBeforeDays() != null ? request.waitBeforeDays() : 0);
        trigger.setCategory(request.categoryId() != null ? categoryRepository.findById(request.categoryId()).orElse(null) : null);
        trigger.setLocation(request.locationId() != null ? locationRepository.findById(request.locationId()).orElse(null) : null);
        trigger.setAsset(request.assetId() != null ? assetRepository.findById(request.assetId()).orElse(null) : null);
        trigger.setTeam(request.teamId() != null ? teamRepository.findById(request.teamId()).orElse(null) : null);
        trigger.setDueDate(request.dueDate());
        trigger.setEstimatedStartDate(request.estimatedStartDate());
        trigger.setEstimatedDurationMinutes(request.estimatedDurationMinutes());
    }

    @Transactional(readOnly = true)
    public List<MeterTriggerResponse> getMeterTriggers(Long meterId) {
        return meterTriggerRepository.findByMeterId(meterId).stream().map(this::toTriggerResponse).toList();
    }

    @Transactional
    public void deleteMeterTrigger(Long triggerId) {
        meterTriggerRepository.deleteById(triggerId);
    }

    private MeterTriggerResponse toTriggerResponse(MeterTrigger t) {
        return new MeterTriggerResponse(t.getId(), t.getName(), t.getCondition(), t.getValue(), t.getWorkOrderTitle(),
                t.getWorkOrderDescription(), t.getPriority(),
                t.getPrimaryAssignee() != null ? t.getPrimaryAssignee().getId() : null,
                t.getPrimaryAssignee() != null ? fullName(t.getPrimaryAssignee()) : null,
                t.getWaitBeforeDays(),
                t.getCategory() != null ? t.getCategory().getId() : null,
                t.getCategory() != null ? t.getCategory().getName() : null,
                t.getLocation() != null ? t.getLocation().getId() : null,
                t.getLocation() != null ? t.getLocation().getName() : null,
                t.getAsset() != null ? t.getAsset().getId() : null,
                t.getAsset() != null ? t.getAsset().getName() : null,
                t.getTeam() != null ? t.getTeam().getId() : null,
                t.getTeam() != null ? t.getTeam().getName() : null,
                t.getDueDate(), t.getEstimatedStartDate(), t.getEstimatedDurationMinutes());
    }

    /**
     * Estado de cumplimiento de la lectura diaria.
     *
     * Las lecturas se toman en el turno nocturno, entre las 00:00 y la hora
     * limite de la organizacion (7 AM por defecto). De ahi los tres estados:
     *
     *   AL_DIA     -> ya se registro en la ventana de hoy
     *   PENDIENTE  -> falta, pero aun no vence la ventana (el turno sigue)
     *   INCUMPLIDO -> paso la hora limite y nadie la registro
     *
     * Un medidor SIN NINGUNA lectura cuenta como pendiente/incumplido segun
     * la hora, nunca como al dia: si no, un medidor recien creado quedaria
     * invisible para siempre y nadie recordaria tomarle la primera lectura.
     *
     * Solo aplica a medidores de frecuencia diaria; los de frecuencia mayor
     * se rigen por la fecha de proxima lectura, no por la ventana del turno.
     */
    /**
     * Estado de lectura de un medidor, sin pasar por toMeterResponse.
     *
     * Lo usa el aviso diario de lecturas pendientes, que necesita saber
     * cuales estan incumplidos sin armar la respuesta completa de cada uno.
     */
    @Transactional(readOnly = true)
    public com.tuempresa.cmms.model.enums.MeterReadingStatus estadoLecturaDe(Meter meter) {
        var ultima = meterReadingRepository.findByMeterIdOrderByReadingDateDesc(meter.getId())
                .stream().findFirst().orElse(null);
        return calcularEstadoLectura(meter, ultima);
    }

    private com.tuempresa.cmms.model.enums.MeterReadingStatus calcularEstadoLectura(
            Meter meter, MeterReading ultima) {
        // Un medidor deshabilitado nunca esta vencido: no se le toman
        // lecturas, asi que no tiene sentido reclamarlas.
        if (Boolean.TRUE.equals(meter.getDisabled())) {
            return com.tuempresa.cmms.model.enums.MeterReadingStatus.AL_DIA;
        }
        if (meter.getUpdateFrequencyDays() == null || meter.getUpdateFrequencyDays() != 1) {
            boolean vencido = ultima == null
                    || ultima.getReadingDate().isBefore(
                            java.time.LocalDate.now(zonaOrganizacion()).atStartOfDay(zonaOrganizacion()).toInstant());
            return vencido
                    ? com.tuempresa.cmms.model.enums.MeterReadingStatus.PENDIENTE
                    : com.tuempresa.cmms.model.enums.MeterReadingStatus.AL_DIA;
        }

        java.time.ZoneId zona = zonaOrganizacion();
        java.time.LocalDate hoy = java.time.LocalDate.now(zona);
        java.time.Instant inicioDeHoy = hoy.atStartOfDay(zona).toInstant();

        boolean registradaHoy = ultima != null && !ultima.getReadingDate().isBefore(inicioDeHoy);
        if (registradaHoy) {
            return com.tuempresa.cmms.model.enums.MeterReadingStatus.AL_DIA;
        }

        int horaLimite = organizationRepository.findById(currentUser.organizationId())
                .map(o -> o.getReadingDeadlineHour() != null ? o.getReadingDeadlineHour() : 7)
                .orElse(7);
        java.time.Instant limiteDeHoy = hoy.atStartOfDay(zona).plusHours(horaLimite).toInstant();

        return java.time.Instant.now().isBefore(limiteDeHoy)
                ? com.tuempresa.cmms.model.enums.MeterReadingStatus.PENDIENTE
                : com.tuempresa.cmms.model.enums.MeterReadingStatus.INCUMPLIDO;
    }

    /** Zona horaria configurada en la organizacion (por defecto la del servidor). */
    private java.time.ZoneId zonaOrganizacion() {
        return organizationRepository.findById(currentUser.organizationId())
                .map(o -> o.getTimezone() != null
                        ? java.time.ZoneId.of(o.getTimezone())
                        : java.time.ZoneId.systemDefault())
                .orElse(java.time.ZoneId.systemDefault());
    }

    private MeterResponse toMeterResponse(Meter meter) {
        List<MeterReading> readings = meterReadingRepository.findByMeterIdOrderByReadingDateDesc(meter.getId());
        MeterReading last = readings.isEmpty() ? null : readings.get(0);
        // Equipo fisico instalado y ultima lectura fisica, para calcular el
        // acumulado real (arrastre + lectura).
        var equipo = meterDeviceRepository.findByMeterIdAndRemovedAtIsNull(meter.getId());
        Double ultimaLectura = last != null ? last.getValue() : null;

        // Ultima lectura DEL EQUIPO ACTUAL. Tras un reemplazo el contador
        // nuevo aun no tiene lecturas, y usar la del anterior duplicaria el
        // acumulado (arrastre 3999 + lectura vieja 3999 = 7998, cuando lo
        // correcto es 3999).
        Double ultimaDelEquipoActual = equipo
                .map(d -> readings.stream()
                        .filter(r -> r.getDevice() != null && r.getDevice().getId().equals(d.getId()))
                        .findFirst()
                        .map(MeterReading::getValue)
                        .orElse(0.0))
                .orElse(ultimaLectura);
        // Igual que MeterMapper real: SIEMPRE se ancla al inicio del dia
        // calendario (atStartOfDay), sin importar la frecuencia -- no es
        // una excepcion solo para frecuencia diaria, es la formula general.
        // Se usa la zona horaria de la ORGANIZACION, no la del servidor.
        //
        // El contenedor corre en UTC, asi que con systemDefault() el
        // "inicio del dia" caia a las 19:00 hora de Ecuador del dia
        // anterior. Por eso una misma fecha aparecia unas veces a las
        // 12:00 AM y otras a las 7:00 PM: dependia de la hora a la que se
        // hubiera tomado la lectura previa.
        java.time.ZoneId zona = zonaOrganizacion();
        Instant nextDue = last == null ? null : last.getReadingDate()
                .atZone(zona)
                .toLocalDate()
                .plusDays(meter.getUpdateFrequencyDays())
                .atStartOfDay(zona)
                .toInstant();
        boolean pastDue = nextDue != null && nextDue.isBefore(Instant.now());
        var readingStatus = calcularEstadoLectura(meter, last);
        Asset asset = meter.getAsset();
        return new MeterResponse(
                meter.getId(), meter.getName(), meter.getUnit(), meter.getUpdateFrequencyDays(),
                last != null ? last.getValue() : null,
                last != null ? last.getReadingDate() : null,
                nextDue, pastDue, readingStatus,
                asset != null ? asset.getId() : null,
                asset != null ? asset.getName() : null,
                meter.getLocation() != null ? meter.getLocation().getId() : null,
                meter.getLocation() != null ? meter.getLocation().getName() : null,
                meter.getCategory() != null ? meter.getCategory().getId() : null,
                meter.getCategory() != null ? meter.getCategory().getName() : null,
                meter.getCreatedBy() != null ? meter.getCreatedBy().getId() : null,
                meter.getCreatedBy() != null ? fullName(meter.getCreatedBy()) : null,
                meter.getAssignedUsers().stream().map(User::getId).toList(),
                meter.getAssignedUsers().stream().map(this::fullName).toList(),
                readings.stream().map(r -> new MeterResponse.MeterReadingResponse(
                        r.getId(), r.getValue(), r.getCreatedBy() != null ? fullName(r.getCreatedBy()) : null,
                        r.getReadingDate(),
                        r.getDevice() != null ? r.getDevice().getOffsetValue() : 0.0
                )).toList(),
                firstMeterImageUrl(meter.getId()),
                meter.getCreatedAt(),
                meter.getTeam() != null ? meter.getTeam().getId() : null,
                meter.getTeam() != null ? meter.getTeam().getName() : null,
                Boolean.TRUE.equals(meter.getDisabled()),
                // Acumulado = arrastre de equipos anteriores + ultima fisica.
                equipo.map(d -> d.getOffsetValue()
                                + (ultimaDelEquipoActual != null ? ultimaDelEquipoActual : 0.0))
                        .orElse(ultimaLectura),
                equipo.map(MeterDevice::getSerialNumber).orElse(null),
                equipo.map(MeterDevice::getInstalledAt).orElse(null)
        );
    }

    /** Igual que workOrder.image real: la primera imagen adjunta al medidor, si hay alguna. */
    private String firstMeterImageUrl(Long meterId) {
        return fileAttachmentRepository.findByMeterIdAndContentTypeStartingWithOrderByCreatedAtAsc(meterId, "image/")
                .map(f -> fileStorageService.getDownloadUrl(f.getStorageKey()))
                .orElse(null);
    }

    // ---- helpers ----

    private void applyFields(Asset asset, String name, String description, AssetStatus status, Long categoryId,
                              String serialNumber, String model, String manufacturer, String power, String area,
                              String barCode, String nfcId, java.time.LocalDate acquisitionDate, Double acquisitionCost,
                              java.time.LocalDate warrantyExpirationDate, java.time.LocalDate inServiceDate,
                              String additionalInfos, String imageUrl, Long locationId, Long parentAssetId,
                              Long primaryUserId, Set<Long> assignedUserIds, Set<Long> teamIds, Set<Long> vendorIds,
                              Set<Long> partIds) {
        asset.setName(name);
        asset.setDescription(description);
        if (status != null) asset.setStatus(status);
        asset.setCategory(categoryId != null ? categoryRepository.findById(categoryId).orElse(null) : null);
        asset.setSerialNumber(serialNumber);
        asset.setModel(model);
        asset.setManufacturer(manufacturer);
        asset.setPower(power);
        asset.setArea(area);
        asset.setBarCode(barCode);
        asset.setNfcId(nfcId);
        asset.setAcquisitionDate(acquisitionDate);
        asset.setAcquisitionCost(acquisitionCost);
        asset.setWarrantyExpirationDate(warrantyExpirationDate);
        asset.setInServiceDate(inServiceDate);
        asset.setAdditionalInfos(additionalInfos);
        asset.setImageUrl(imageUrl);
        asset.setLocation(locationId != null ? locationRepository.findById(locationId).orElse(null) : null);
        asset.setParentAsset(parentAssetId != null ? assetRepository.findById(parentAssetId).orElse(null) : null);
        asset.setPrimaryUser(primaryUserId != null ? userRepository.findById(primaryUserId).orElse(null) : null);
        asset.setAssignedUsers(assignedUserIds != null && !assignedUserIds.isEmpty()
                ? new HashSet<>(userRepository.findAllById(assignedUserIds)) : new HashSet<>());
        // Team.assets es el lado dueño de la relacion (ver Asset.teams,
        // mappedBy) -- se sincroniza desde aca, no con asset.setTeams().
        syncTeams(asset, teamIds);
        asset.setVendors(vendorIds != null && !vendorIds.isEmpty()
                ? new HashSet<>(vendorRepository.findAllById(vendorIds)) : new HashSet<>());
        asset.setParts(partIds != null && !partIds.isEmpty()
                ? new HashSet<>(partRepository.findAllById(partIds)) : new HashSet<>());
    }

    private void syncTeams(Asset asset, java.util.Set<Long> teamIds) {
        if (asset.getId() == null) return; // se sincroniza despues del primer save (necesita el id)
        java.util.Set<Long> targetIds = teamIds != null ? teamIds : java.util.Set.of();
        List<Team> currentTeams = teamRepository.findByAssetsContaining(asset);
        for (Team team : currentTeams) {
            if (!targetIds.contains(team.getId())) {
                team.getAssets().remove(asset);
                teamRepository.save(team);
            }
        }
        java.util.Set<Long> currentIds = currentTeams.stream().map(Team::getId).collect(java.util.stream.Collectors.toSet());
        for (Long teamId : targetIds) {
            if (!currentIds.contains(teamId)) {
                teamRepository.findById(teamId).ifPresent(team -> {
                    team.getAssets().add(asset);
                    teamRepository.save(team);
                });
            }
        }
    }

    private void applyDeprecation(Asset asset, CreateAssetRequest.DeprecationInput input) {
        if (input == null) {
            asset.setDeprecation(null);
            return;
        }
        Deprecation dep = asset.getDeprecation() != null ? asset.getDeprecation() : new Deprecation();
        dep.setOrganizationId(asset.getOrganizationId());
        dep.setPurchasePrice(input.purchasePrice());
        dep.setPurchaseDate(input.purchaseDate());
        dep.setResidualValue(input.residualValue());
        dep.setUsefulLife(input.usefulLife());
        dep.setRate(input.rate());
        dep.setCurrentValue(input.currentValue());
        asset.setDeprecation(deprecationRepository.save(dep));
    }

    private void applyDeprecation(Asset asset, UpdateAssetRequest.DeprecationInput input) {
        if (input == null) {
            asset.setDeprecation(null);
            return;
        }
        applyDeprecation(asset, new CreateAssetRequest.DeprecationInput(
                input.purchasePrice(), input.purchaseDate(), input.residualValue(),
                input.usefulLife(), input.rate(), input.currentValue()));
    }

    private Asset findOrThrow(Long id) {
        return assetRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Asset no encontrado: id=" + id));
    }

    private String fullName(User u) {
        String first = u.getFirstName() != null ? u.getFirstName() : "";
        String last = u.getLastName() != null ? u.getLastName() : "";
        return (first + " " + last).trim();
    }

    AssetResponse toResponse(Asset asset) {
        return new AssetResponse(
                asset.getId(), asset.getCustomId(), asset.getName(), asset.getDescription(), asset.getStatus(),
                asset.getCategory() != null ? asset.getCategory().getId() : null,
                asset.getCategory() != null ? asset.getCategory().getName() : null,
                asset.getSerialNumber(), asset.getModel(), asset.getManufacturer(), asset.getPower(), asset.getArea(),
                asset.getBarCode(), asset.getNfcId(), asset.getAcquisitionDate(), asset.getAcquisitionCost(),
                asset.getWarrantyExpirationDate(), asset.getInServiceDate(), asset.getAdditionalInfos(), asset.getImageUrl(),
                asset.getLocation() != null ? asset.getLocation().getId() : null,
                asset.getLocation() != null ? asset.getLocation().getName() : null,
                asset.getParentAsset() != null ? asset.getParentAsset().getId() : null,
                asset.getParentAsset() != null ? asset.getParentAsset().getName() : null,
                asset.getPrimaryUser() != null ? asset.getPrimaryUser().getId() : null,
                asset.getPrimaryUser() != null ? fullName(asset.getPrimaryUser()) : null,
                asset.getAssignedUsers().stream().map(u -> new AssetResponse.IdName(u.getId(), fullName(u))).toList(),
                asset.getTeams().stream().map(t -> new AssetResponse.IdName(t.getId(), t.getName())).toList(),
                asset.getVendors().stream().map(v -> new AssetResponse.IdName(v.getId(), v.getCompanyName())).toList(),
                asset.getParts().stream().map(p -> new AssetResponse.IdName(p.getId(), p.getName())).toList(),
                asset.getDeprecation() != null ? new AssetResponse.DeprecationResponse(
                        asset.getDeprecation().getPurchasePrice(), asset.getDeprecation().getPurchaseDate(),
                        asset.getDeprecation().getResidualValue(), asset.getDeprecation().getUsefulLife(),
                        asset.getDeprecation().getRate(), asset.getDeprecation().getCurrentValue()) : null,
                asset.getCreatedAt(), asset.getUpdatedAt(),
                // Copia fiel de assetService.hasChildren(id) real: el arbol
                // necesita saber si un nodo se puede expandir ANTES de
                // haber traido sus hijos.
                assetRepository.countByParentAssetId(asset.getId()) > 0
        );
    }
}
