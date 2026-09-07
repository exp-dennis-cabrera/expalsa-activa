package com.tuempresa.cmms.model.envers;

import com.tuempresa.cmms.model.entity.User;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.envers.RevisionEntity;
import org.hibernate.envers.RevisionNumber;
import org.hibernate.envers.RevisionTimestamp;

/**
 * Copia fiel de RevInfo real: cada vez que Envers detecta un cambio en una
 * entidad auditada, crea una fila aca con el numero de revision, la marca
 * de tiempo y QUIEN lo hizo (ese ultimo dato lo pone UserRevisionListener).
 */
@Entity
@Getter
@Setter
@NoArgsConstructor
@Table(name = "revinfo")
@RevisionEntity(UserRevisionListener.class)
public class RevInfo {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @RevisionNumber
    @Column(name = "rev")
    private int id;

    @RevisionTimestamp
    @Column(name = "revtstmp")
    private long timestamp;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id")
    private User user;
}
