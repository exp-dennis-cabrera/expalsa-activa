package com.tuempresa.cmms.model.envers;

import jakarta.persistence.Column;
import jakarta.persistence.Embeddable;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import lombok.Getter;
import lombok.Setter;

import java.io.Serializable;

/** Copia fiel de WorkOrderAudId real: clave compuesta (id de la orden + numero de revision). */
@Embeddable
@Getter
@Setter
public class WorkOrderAudId implements Serializable {

    private static final long serialVersionUID = 1L;

    @Column(name = "id")
    private Long id;

    @ManyToOne
    @JoinColumn(name = "rev")
    private RevInfo rev;

    // Hibernate exige equals/hashCode en las claves compuestas: sin ellos,
    // dos filas distintas pueden considerarse "la misma" al deduplicar
    // resultados, y el historial saldria incompleto. (El real los obtiene
    // de Lombok @Data; aca se escriben explicitamente.)
    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (!(o instanceof WorkOrderAudId otro)) return false;
        Integer miRev = rev != null ? rev.getId() : null;
        Integer suRev = otro.rev != null ? otro.rev.getId() : null;
        return java.util.Objects.equals(id, otro.id) && java.util.Objects.equals(miRev, suRev);
    }

    @Override
    public int hashCode() {
        return java.util.Objects.hash(id, rev != null ? rev.getId() : null);
    }
}
