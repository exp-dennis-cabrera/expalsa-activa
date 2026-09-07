package com.tuempresa.cmms.config;

import com.tuempresa.cmms.model.entity.Organization;
import com.tuempresa.cmms.model.entity.Role;
import com.tuempresa.cmms.model.enums.RoleCode;
import com.tuempresa.cmms.repository.OrganizationRepository;
import com.tuempresa.cmms.repository.RoleRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

/**
 * Antes de que el registro creara los 6 roles predefinidos (ver
 * AuthService.register), solo se creaba ADMIN, y con el nombre en ingles
 * (por ejemplo "ADMIN" en vez de "Administrador"). Cualquier organizacion
 * registrada antes de ese arreglo se quedo sin LIMITED_ADMIN, TECHNICIAN,
 * LIMITED_TECHNICIAN, VIEW_ONLY y REQUESTER, y su rol ADMIN existente
 * quedo con el nombre en ingles. Este backfill corre al arrancar (en
 * cualquier entorno, no solo "dev") y:
 * 1. Crea los roles predefinidos que le falten a cada organizacion.
 * 2. Renombra a español cualquier rol predefinido existente cuyo nombre
 *    todavia sea el codigo en ingles (ADMIN, LIMITED_ADMIN, etc.).
 * El chequeo de "ya existe" se hace por "code" (el enum RoleCode, fijo),
 * no por "name" (el nombre en español para mostrar, que es variable).
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class DefaultRolesBackfill implements CommandLineRunner {

    private static final List<RoleCode> DEFAULT_ROLE_CODES = List.of(
            RoleCode.ADMIN, RoleCode.LIMITED_ADMIN, RoleCode.TECHNICIAN,
            RoleCode.LIMITED_TECHNICIAN, RoleCode.VIEW_ONLY, RoleCode.REQUESTER
    );

    private final OrganizationRepository organizationRepository;
    private final RoleRepository roleRepository;

    @Override
    @Transactional
    public void run(String... args) {
        int created = 0;
        int renamed = 0;
        for (Organization org : organizationRepository.findAll()) {
            List<Role> existingRoles = roleRepository.findByOrganizationId(org.getId());

            for (RoleCode code : DEFAULT_ROLE_CODES) {
                Role existing = existingRoles.stream()
                        .filter(r -> code.equals(r.getCode()) || code.name().equals(r.getName()))
                        .findFirst()
                        .orElse(null);

                if (existing == null) {
                    Role role = new Role();
                    role.setOrganizationId(org.getId());
                    role.setName(DefaultRolePermissions.displayName(code));
                    role.setCode(code);
                    role.setDescription(DefaultRolePermissions.defaultDescription(code));
                    DefaultRolePermissions.apply(role, code);
                    roleRepository.save(role);
                    created++;
                } else {
                    boolean needsRename = !DefaultRolePermissions.displayName(code).equals(existing.getName());
                    boolean needsCode = existing.getCode() == null;
                    boolean needsDescription = existing.getDescription() == null || existing.getDescription().isBlank();
                    if (needsRename || needsCode || needsDescription) {
                        existing.setName(DefaultRolePermissions.displayName(code));
                        existing.setCode(code);
                        existing.setDescription(DefaultRolePermissions.defaultDescription(code));
                        roleRepository.save(existing);
                        renamed++;
                    }
                }
            }
        }
        if (created > 0 || renamed > 0) {
            log.info("Backfill de roles predefinidos: {} creados, {} renombrados a español.", created, renamed);
        }
    }
}
