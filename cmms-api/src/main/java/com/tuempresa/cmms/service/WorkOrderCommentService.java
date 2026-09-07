package com.tuempresa.cmms.service;

import com.tuempresa.cmms.dto.request.CreateCommentRequest;
import com.tuempresa.cmms.dto.response.CommentResponse;
import com.tuempresa.cmms.exception.ForbiddenOperationException;
import com.tuempresa.cmms.exception.ResourceNotFoundException;
import com.tuempresa.cmms.model.entity.User;
import com.tuempresa.cmms.model.entity.WorkOrder;
import com.tuempresa.cmms.model.entity.WorkOrderComment;
import com.tuempresa.cmms.model.enums.RoleNames;
import com.tuempresa.cmms.repository.UserRepository;
import com.tuempresa.cmms.repository.WorkOrderCommentRepository;
import com.tuempresa.cmms.repository.WorkOrderRepository;
import com.tuempresa.cmms.repository.WorkOrderStatusHistoryRepository;
import com.tuempresa.cmms.security.CurrentUserProvider;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

/**
 * Comentarios en work orders. Cualquier rol autenticado puede comentar
 * (incluido Requester), igual que en Atlas -- es el canal de comunicacion
 * mas abierto del sistema. Solo Admin o el propio autor pueden borrar.
 */
@Service
@RequiredArgsConstructor
public class WorkOrderCommentService {

    private final WorkOrderCommentRepository commentRepository;
    private final WorkOrderRepository workOrderRepository;
    private final UserRepository userRepository;
    private final WorkOrderStatusHistoryRepository statusHistoryRepository;
    private final CurrentUserProvider currentUser;
    private final NotificationService notificationService;
    private final com.tuempresa.cmms.repository.FileAttachmentRepository fileAttachmentRepository;
    private final com.tuempresa.cmms.service.storage.FileStorageService fileStorageService;

    @Transactional
    public CommentResponse create(Long workOrderId, CreateCommentRequest request) {
        WorkOrder wo = workOrderRepository.findById(workOrderId)
                .orElseThrow(() -> new ResourceNotFoundException("Work order no encontrado: id=" + workOrderId));
        if (wo.getFirstReactedAt() == null) {
            wo.setFirstReactedAt(java.time.Instant.now());
            workOrderRepository.save(wo);
        }
        User author = userRepository.findById(currentUser.userId())
                .orElseThrow(() -> new ResourceNotFoundException("Usuario no encontrado"));

        WorkOrderComment comment = new WorkOrderComment();
        comment.setOrganizationId(currentUser.organizationId());
        comment.setWorkOrder(wo);
        comment.setAuthor(author);
        comment.setContent(request.content());
        WorkOrderComment saved = commentRepository.save(comment);

        // Los archivos (incluidas notas de voz) ya se subieron antes con el
        // endpoint generico de archivos de la orden -- aca solo se asocian
        // a este comentario en particular.
        if (request.fileIds() != null) {
            for (Long fileId : request.fileIds()) {
                fileAttachmentRepository.findById(fileId).ifPresent(f -> {
                    f.setComment(saved);
                    fileAttachmentRepository.save(f);
                });
            }
        }

        String message = fullName(author) + " comento en \"" + wo.getTitle() + "\": " + truncate(request.content());
        if (wo.getCreatedBy() != null) {
            notificationService.notifyUser(wo.getCreatedBy(), "WORK_ORDER_COMMENT", "Nuevo comentario", message, wo.getId());
        }
        if (wo.getPrimaryAssignee() != null) {
            notificationService.notifyUser(wo.getPrimaryAssignee(), "WORK_ORDER_COMMENT", "Nuevo comentario", message, wo.getId());
        }

        // Mencionados con @: mismo comportamiento que getNotifiedUsers real,
        // que suma los "taggedUsers" a los notificados. No se notifica a
        // quien escribe, ni dos veces a quien ya fue notificado arriba.
        var yaNotificados = new java.util.HashSet<Long>();
        if (wo.getCreatedBy() != null) yaNotificados.add(wo.getCreatedBy().getId());
        if (wo.getPrimaryAssignee() != null) yaNotificados.add(wo.getPrimaryAssignee().getId());
        yaNotificados.add(author.getId());

        for (Long mencionadoId : saved.extractTaggedUserIds()) {
            if (yaNotificados.contains(mencionadoId)) continue;
            userRepository.findById(mencionadoId).ifPresent(mencionado ->
                    notificationService.notifyUser(mencionado, "WORK_ORDER_COMMENT",
                            "Te mencionaron en un comentario", message, wo.getId()));
        }

        return toResponse(saved);
    }

    /**
     * Copia fiel de CommentController.getByWorkOrder real: mezcla los
     * comentarios escritos con el historial de estados convertido en
     * comentarios automaticos, y ordena todo por fecha.
     *
     * Asi el usuario ve en un solo hilo lo que se comento y los cambios de
     * estado, sin tener que mirar dos pantallas.
     */
    @Transactional(readOnly = true)
    public List<CommentResponse> list(Long workOrderId) {
        var comentarios = commentRepository.findByWorkOrderIdOrderByCreatedAtAsc(workOrderId).stream()
                .map(this::toResponse);

        var historial = statusHistoryRepository.findByWorkOrderIdOrderByChangedAtAsc(workOrderId).stream()
                .map(h -> new CommentResponse(
                        // Id negativo para no chocar con los comentarios
                        // reales; el original usa un aleatorio.
                        -h.getId(),
                        "Estado: " + (h.getStatus() != null ? h.getStatus().getEtiqueta() : ""),
                        h.getChangedBy() != null ? h.getChangedBy().getId() : null,
                        h.getChangedBy() != null
                                ? h.getChangedBy().getFirstName() + " " + h.getChangedBy().getLastName()
                                : "Sistema",
                        h.getChangedAt(),
                        java.util.List.of(),
                        true));

        return java.util.stream.Stream.concat(comentarios, historial)
                .sorted(java.util.Comparator.comparing(CommentResponse::createdAt))
                .toList();
    }


    @Transactional
    public void delete(Long commentId) {
        WorkOrderComment comment = commentRepository.findById(commentId)
                .orElseThrow(() -> new ResourceNotFoundException("Comentario no encontrado: id=" + commentId));

        boolean isAuthor = comment.getAuthor().getId().equals(currentUser.userId());
        boolean isAdmin = RoleNames.ADMIN.equalsIgnoreCase(currentUser.get().getRoleName());
        if (!isAuthor && !isAdmin) {
            throw new ForbiddenOperationException("Solo el autor o un administrador pueden eliminar este comentario.");
        }
        commentRepository.delete(comment);
    }

    private String truncate(String s) {
        return s.length() > 80 ? s.substring(0, 80) + "..." : s;
    }

    private String fullName(User u) {
        String first = u.getFirstName() != null ? u.getFirstName() : "";
        String last = u.getLastName() != null ? u.getLastName() : "";
        return (first + " " + last).trim();
    }

    private CommentResponse toResponse(WorkOrderComment c) {
        List<com.tuempresa.cmms.dto.response.FileResponse> files = fileAttachmentRepository.findByCommentId(c.getId()).stream()
                .map(f -> new com.tuempresa.cmms.dto.response.FileResponse(
                        f.getId(), f.getFileName(), fileStorageService.getDownloadUrl(f.getStorageKey()),
                        f.getContentType(), f.getSizeBytes(), f.getUploadedBy() != null ? fullName(f.getUploadedBy()) : null, f.getCreatedAt()))
                .toList();
        // system = false: es un comentario escrito por una persona.
        return new CommentResponse(c.getId(), c.getFormattedContent(), c.getAuthor().getId(), fullName(c.getAuthor()), c.getCreatedAt(), files, false);
    }
}
