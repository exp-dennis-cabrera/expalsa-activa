package com.tuempresa.cmms.model.envers;

import com.tuempresa.cmms.security.CmmsUserDetails;
import org.hibernate.envers.RevisionListener;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;

/**
 * Copia fiel de UserRevisionListener real: al crear una revision, guarda
 * QUE USUARIO la origino, tomandolo del contexto de seguridad.
 *
 * Nuestro CmmsUserDetails guarda solo el ID del usuario (no la entidad
 * completa), asi que aca se referencia por ID -- el resultado es el mismo.
 */
public class UserRevisionListener implements RevisionListener {

    @Override
    public void newRevision(Object revisionEntity) {
        RevInfo revision = (RevInfo) revisionEntity;
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || !(authentication.getPrincipal() instanceof CmmsUserDetails userDetails)) {
            return;
        }
        com.tuempresa.cmms.model.entity.User user = new com.tuempresa.cmms.model.entity.User();
        user.setId(userDetails.getUserId());
        revision.setUser(user);
    }
}
