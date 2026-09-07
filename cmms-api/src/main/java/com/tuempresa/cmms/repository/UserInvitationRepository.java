package com.tuempresa.cmms.repository;

import com.tuempresa.cmms.model.entity.UserInvitation;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.Instant;
import java.util.List;
import java.util.Optional;

public interface UserInvitationRepository extends JpaRepository<UserInvitation, Long> {
    Optional<UserInvitation> findByEmail(String email);

    @Query("SELECT i FROM UserInvitation i WHERE i.createdAt >= :since ORDER BY i.createdAt DESC")
    List<UserInvitation> findRecentSince(@Param("since") Instant since);
}
