package com.tuempresa.cmms.repository;

import com.tuempresa.cmms.model.entity.Location;
import org.springframework.data.jpa.repository.JpaRepository;

public interface LocationRepository extends JpaRepository<Location, Long>, org.springframework.data.jpa.repository.JpaSpecificationExecutor<Location> {
    // Igual que findByParentLocation_Id real: hijos directos de un padre.
    java.util.List<Location> findByParentLocationId(Long parentLocationId);
    // Ubicaciones raiz (sin padre) -- igual que el caso id=0 real.
    java.util.List<Location> findByParentLocationIsNull();

    /** Versiones paginadas, para el arbol que carga un nivel al expandir. */
    org.springframework.data.domain.Page<Location> findByParentLocationId(
            Long parentLocationId, org.springframework.data.domain.Pageable pageable);

    org.springframework.data.domain.Page<Location> findByParentLocationIsNull(
            org.springframework.data.domain.Pageable pageable);
}
