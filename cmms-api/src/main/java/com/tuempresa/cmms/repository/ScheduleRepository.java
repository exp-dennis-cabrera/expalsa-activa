package com.tuempresa.cmms.repository;

import com.tuempresa.cmms.model.entity.Schedule;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ScheduleRepository extends JpaRepository<Schedule, Long> {
}
