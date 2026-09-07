package com.tuempresa.cmms.config;

import com.tuempresa.cmms.model.entity.*;
import com.tuempresa.cmms.model.enums.RoleCode;
import com.tuempresa.cmms.model.enums.UserStatus;
import com.tuempresa.cmms.model.enums.WorkOrderPriority;
import com.tuempresa.cmms.model.enums.WorkOrderStatus;
import com.tuempresa.cmms.repository.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Profile;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

import java.time.DayOfWeek;
import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalTime;
import java.time.ZoneOffset;

/**
 * Solo corre con SPRING_PROFILES_ACTIVE=dev (perfil por defecto en application.yml).
 * Es idempotente: si ya existe el usuario admin demo, no hace nada.
 * NUNCA se activa en el perfil "prod".
 *
 * Crea un usuario de prueba por cada uno de los 5 roles reales de Atlas CMMS,
 * para poder verificar la matriz de permisos de Work Orders manualmente.
 */
@Component
@Profile("dev")
@RequiredArgsConstructor
@Slf4j
public class DevDataSeeder implements CommandLineRunner {

    private static final String DEMO_PASSWORD = "password123";

    private final OrganizationRepository organizationRepository;
    private final RoleRepository roleRepository;
    private final UserRepository userRepository;
    private final LocationRepository locationRepository;
    private final AssetRepository assetRepository;
    private final PartRepository partRepository;
    private final CategoryRepository categoryRepository;
    private final WorkOrderRepository workOrderRepository;
    private final ShiftDayRepository shiftDayRepository;
    private final PasswordEncoder passwordEncoder;

    @Override
    public void run(String... args) {
        if (userRepository.findByEmail("admin@demo.com").isPresent()) {
            log.info("Datos de prueba ya existen, se omite el seeder.");
            return;
        }

        log.info("Creando datos de prueba...");

        Organization org = new Organization();
        org.setName("Demo Org");
        org.setSubdomain("demo");
        org = organizationRepository.save(org);

        User admin = createUser(org.getId(), "admin@demo.com", "Admin", "Demo", RoleCode.ADMIN);
        User limitedAdmin = createUser(org.getId(), "limitedadmin@demo.com", "Limited", "Admin", RoleCode.LIMITED_ADMIN);
        User technician = createUser(org.getId(), "technician@demo.com", "Tecnico", "Demo", RoleCode.TECHNICIAN);
        technician.setHourlyRate(18.0);
        userRepository.save(technician);
        User limitedTechnician = createUser(org.getId(), "limitedtechnician@demo.com", "Tecnico", "Limitado", RoleCode.LIMITED_TECHNICIAN);
        createUser(org.getId(), "viewonly@demo.com", "Solo Lectura", "Demo", RoleCode.VIEW_ONLY);
        createUser(org.getId(), "requester@demo.com", "Solicitante", "Demo", RoleCode.REQUESTER);

        Location location = new Location();
        location.setOrganizationId(org.getId());
        location.setName("Planta Principal");
        location.setAddress("Av. Industrial 123");
        location = locationRepository.save(location);

        Asset asset = new Asset();
        asset.setOrganizationId(org.getId());
        asset.setCustomId("A000001");
        asset.setName("Compresor de aire #1");
        asset.setStatus(com.tuempresa.cmms.model.enums.AssetStatus.OPERATIONAL);
        asset.setLocation(location);
        asset = assetRepository.save(asset);

        Part part = new Part();
        part.setOrganizationId(org.getId());
        part.setName("Filtro de aire industrial");
        part.setQuantity(20);
        part.setMinQuantity(5);
        part.setCost(15.5);
        part.setLocation(location);
        partRepository.save(part);

        Category category = new Category();
        category.setOrganizationId(org.getId());
        category.setName("Preventivo");
        category.setType("WORK_ORDER");
        category = categoryRepository.save(category);

        WorkOrder wo = new WorkOrder();
        wo.setOrganizationId(org.getId());
        wo.setTitle("Revisión preventiva mensual");
        wo.setDescription("Chequeo de presión, filtros y ruido anómalo.");
        wo.setStatus(WorkOrderStatus.OPEN);
        wo.setPriority(WorkOrderPriority.MEDIUM);
        wo.setCategory(category);
        wo.setAsset(asset);
        wo.setLocation(location);
        wo.setCreatedBy(admin);
        wo.setPrimaryAssignee(technician);
        workOrderRepository.save(wo);

        // ---- Turnos de prueba: turno dia para Tecnico Demo, turno nocturno
        // para Tecnico Limitado -- asi ambos muestran capacidad real en la
        // Vista de Carga de Trabajo sin tener que configurarlos a mano.
        seedShift(org.getId(), technician, LocalTime.of(7, 0), LocalTime.of(16, 0));
        seedShift(org.getId(), limitedTechnician, LocalTime.of(18, 0), LocalTime.of(7, 0));

        // ---- Ordenes de prueba para la Vista de Carga de Trabajo: fechas
        // relativas al lunes de la semana actual, asi siempre caen en
        // "Esta semana" sin importar cuando se corra el seeder.
        LocalDate monday = LocalDate.now().with(DayOfWeek.MONDAY);

        seedWorkOrder(org.getId(), admin, technician, category, asset, location,
                "Cambio de aceite compresor", WorkOrderPriority.LOW, WorkOrderStatus.OPEN,
                atDay(monday, LocalTime.of(8, 0)), 120, null);

        seedWorkOrder(org.getId(), admin, technician, category, asset, location,
                "Inspección eléctrica de tablero", WorkOrderPriority.MEDIUM, WorkOrderStatus.OPEN,
                atDay(monday.plusDays(1), LocalTime.of(9, 0)), 180, null);

        seedWorkOrder(org.getId(), admin, limitedTechnician, category, asset, location,
                "Fuga de refrigerante en línea 2", WorkOrderPriority.HIGH, WorkOrderStatus.OPEN,
                atDay(monday.plusDays(2), LocalTime.of(19, 0)), 240, null);

        seedWorkOrder(org.getId(), admin, technician, category, asset, location,
                "Limpieza de filtros HVAC", WorkOrderPriority.LOW, WorkOrderStatus.COMPLETED,
                atDay(monday.plusDays(3), LocalTime.of(10, 0)), 60, null);

        // Sin programar, con vencimiento manana -> aparece en "Por vencer"
        seedWorkOrder(org.getId(), admin, null, category, asset, location,
                "Calibración de sensores de presión", WorkOrderPriority.MEDIUM, WorkOrderStatus.OPEN,
                null, 90, Instant.now().plus(30, java.time.temporal.ChronoUnit.HOURS));

        // Sin programar, ya vencida -> aparece en "Vencidas"
        seedWorkOrder(org.getId(), admin, null, category, asset, location,
                "Reemplazo de banda transportadora", WorkOrderPriority.HIGH, WorkOrderStatus.OPEN,
                null, 150, Instant.now().minus(2, java.time.temporal.ChronoUnit.DAYS));

        log.info("Seed listo. Usuarios de prueba (password: {} para todos):", DEMO_PASSWORD);
        log.info("  Admin              -> admin@demo.com");
        log.info("  Limited Admin      -> limitedadmin@demo.com");
        log.info("  Technician         -> technician@demo.com");
        log.info("  Limited Technician -> limitedtechnician@demo.com");
        log.info("  View Only          -> viewonly@demo.com");
        log.info("  Requester          -> requester@demo.com");
    }

    private User createUser(Long orgId, String email, String firstName, String lastName, com.tuempresa.cmms.model.enums.RoleCode roleCode) {
        Role role = new Role();
        role.setOrganizationId(orgId);
        role.setName(DefaultRolePermissions.displayName(roleCode));
        role.setCode(roleCode);
        role.setDescription(DefaultRolePermissions.defaultDescription(roleCode));
        applyDefaultPermissions(role, roleCode);
        role = roleRepository.save(role);

        User user = new User();
        user.setOrganizationId(orgId);
        user.setEmail(email);
        user.setPasswordHash(passwordEncoder.encode(DEMO_PASSWORD));
        user.setFirstName(firstName);
        user.setLastName(lastName);
        user.setStatus(UserStatus.ACTIVE);
        user.setRole(role);
        return userRepository.save(user);
    }

    /**
     * Copia fiel de Helper.getDefaultRoles() real: los 5 conjuntos de
     * permisos exactos para cada uno de los 6 roles predefinidos.
     */
    private void applyDefaultPermissions(Role role, com.tuempresa.cmms.model.enums.RoleCode roleCode) {
        DefaultRolePermissions.apply(role, roleCode);
    }

    /** Configura Lunes a Viernes con el mismo horario para un usuario. */
    private void seedShift(Long orgId, User user, LocalTime start, LocalTime end) {
        for (DayOfWeek day : new DayOfWeek[]{DayOfWeek.MONDAY, DayOfWeek.TUESDAY, DayOfWeek.WEDNESDAY,
                DayOfWeek.THURSDAY, DayOfWeek.FRIDAY}) {
            ShiftDay shift = new ShiftDay();
            shift.setOrganizationId(orgId);
            shift.setUser(user);
            shift.setDayOfWeek(day.name());
            shift.setEnabled(true);
            shift.setStartTime(start);
            shift.setEndTime(end);
            shiftDayRepository.save(shift);
        }
    }

    private Instant atDay(LocalDate date, LocalTime time) {
        return date.atTime(time).atZone(ZoneOffset.UTC).toInstant();
    }

    private void seedWorkOrder(Long orgId, User createdBy, User assignee, Category category, Asset asset,
                                Location location, String title, WorkOrderPriority priority, WorkOrderStatus status,
                                Instant estimatedStartDate, Integer estimatedDurationMinutes, Instant dueDate) {
        WorkOrder wo = new WorkOrder();
        wo.setOrganizationId(orgId);
        wo.setTitle(title);
        wo.setStatus(status);
        wo.setPriority(priority);
        wo.setCategory(category);
        wo.setAsset(asset);
        wo.setLocation(location);
        wo.setCreatedBy(createdBy);
        wo.setPrimaryAssignee(assignee);
        wo.setEstimatedStartDate(estimatedStartDate);
        wo.setEstimatedDurationMinutes(estimatedDurationMinutes);
        wo.setDueDate(dueDate);
        if (status == WorkOrderStatus.COMPLETED) {
            wo.setCompletedAt(Instant.now());
        }
        workOrderRepository.save(wo);
    }
}
