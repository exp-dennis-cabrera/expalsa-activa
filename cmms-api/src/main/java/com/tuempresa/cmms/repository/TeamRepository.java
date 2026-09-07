package com.tuempresa.cmms.repository;

import com.tuempresa.cmms.model.entity.Asset;
import com.tuempresa.cmms.model.entity.Team;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

import java.util.List;

public interface TeamRepository extends JpaRepository<Team, Long>, JpaSpecificationExecutor<Team> {
    List<Team> findByMembers_Id(Long userId);
    List<Team> findByAssetsContaining(Asset asset);
}
