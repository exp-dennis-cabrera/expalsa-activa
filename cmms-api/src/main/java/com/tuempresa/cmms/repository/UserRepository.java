package com.tuempresa.cmms.repository;

import com.tuempresa.cmms.model.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface UserRepository extends JpaRepository<User, Long>, JpaSpecificationExecutor<User> {

    Optional<User> findByEmail(String email);

    /**
     * Trae el User junto con su Role en la misma query (JOIN FETCH),
     * evitando LazyInitializationException cuando open-in-view esta deshabilitado
     * (ver CustomUserDetailsService, donde el Role se lee fuera del contexto
     * transaccional original).
     */
    @Query("SELECT u FROM User u LEFT JOIN FETCH u.role WHERE u.email = :email")
    Optional<User> findByEmailWithRole(@Param("email") String email);

    @Query("SELECT u FROM User u LEFT JOIN FETCH u.role WHERE u.id = :id")
    Optional<User> findByIdWithRole(@Param("id") Long id);

    @Query("SELECT u FROM User u LEFT JOIN FETCH u.role")
    List<User> findAllWithRole();

    @Query("SELECT u FROM User u WHERE u.role.code IN :roleCodes")
    List<User> findByRoleNameIn(@Param("roleCodes") java.util.Collection<com.tuempresa.cmms.model.enums.RoleCode> roleCodes);

    long countByRoleId(Long roleId);

    // Version con organizationId explicito -- necesaria para llamadas desde
    // jobs en segundo plano, donde el filtro de tenant de Hibernate no esta
    // activo (ese filtro solo se activa por request HTTP, ver TenantFilter).
    @Query("SELECT u FROM User u WHERE u.role.code IN :roleCodes AND u.organizationId = :orgId")
    List<User> findByRoleNameInAndOrganizationId(@Param("roleCodes") java.util.Collection<com.tuempresa.cmms.model.enums.RoleCode> roleCodes,
                                                  @Param("orgId") Long orgId);
}
