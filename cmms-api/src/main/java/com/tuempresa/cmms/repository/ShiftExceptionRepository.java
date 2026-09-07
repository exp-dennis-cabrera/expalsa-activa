package com.tuempresa.cmms.repository;

import com.tuempresa.cmms.model.entity.ShiftException;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

public interface ShiftExceptionRepository extends JpaRepository<ShiftException, Long> {
    Optional<ShiftException> findByUserIdAndExceptionDate(Long userId, LocalDate exceptionDate);
    List<ShiftException> findByUserIdOrderByExceptionDateAsc(Long userId);

    /** Excepciones de varios usuarios en un rango, en una sola consulta. */
    List<ShiftException> findByUserIdInAndExceptionDateBetween(
            java.util.Collection<Long> userIds, LocalDate desde, LocalDate hasta);
}
