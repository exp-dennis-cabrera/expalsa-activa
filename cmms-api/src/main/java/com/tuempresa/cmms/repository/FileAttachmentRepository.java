package com.tuempresa.cmms.repository;

import com.tuempresa.cmms.model.entity.FileAttachment;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface FileAttachmentRepository extends JpaRepository<FileAttachment, Long> {
    List<FileAttachment> findByWorkOrderId(Long workOrderId);
    int countByWorkOrderId(Long workOrderId);
    List<FileAttachment> findByCommentId(Long commentId);
    java.util.Optional<FileAttachment> findByMeterIdAndContentTypeStartingWithOrderByCreatedAtAsc(Long meterId, String contentTypePrefix);
    List<FileAttachment> findByAssetId(Long assetId);
    List<FileAttachment> findByLocationId(Long locationId);

    // Para mostrar una miniatura en la lista de ordenes, igual que el real
    // (workOrder.image): la primera imagen adjunta, si hay alguna.
    java.util.Optional<FileAttachment> findFirstByWorkOrderIdAndContentTypeStartingWithOrderByCreatedAtAsc(Long workOrderId, String contentTypePrefix);
}
