package com.tuempresa.cmms.dto.response;

import java.time.Instant;
import java.util.List;

public record CommentResponse(Long id, String content, Long authorId, String authorName, Instant createdAt, List<FileResponse> files,
        /**
         * true = comentario automatico generado por un cambio de estado.
         * Igual que el campo "system" de CommentShowDTO real: la interfaz
         * los muestra sin opcion de editar ni borrar.
         */
        Boolean system) {
}
