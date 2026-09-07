package com.tuempresa.cmms.service;

import com.tuempresa.cmms.dto.response.FileResponse;
import com.tuempresa.cmms.exception.ForbiddenOperationException;
import com.tuempresa.cmms.exception.ResourceNotFoundException;
import com.tuempresa.cmms.model.entity.Asset;
import com.tuempresa.cmms.model.entity.FileAttachment;
import com.tuempresa.cmms.model.entity.Location;
import com.tuempresa.cmms.model.entity.User;
import com.tuempresa.cmms.model.entity.WorkOrder;
import com.tuempresa.cmms.model.enums.RoleNames;
import com.tuempresa.cmms.repository.AssetRepository;
import com.tuempresa.cmms.repository.FileAttachmentRepository;
import com.tuempresa.cmms.repository.LocationRepository;
import com.tuempresa.cmms.repository.UserRepository;
import com.tuempresa.cmms.repository.WorkOrderRepository;
import com.tuempresa.cmms.security.CurrentUserProvider;
import com.tuempresa.cmms.service.storage.FileStorageService;
import com.tuempresa.cmms.service.storage.StoredFile;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;
import java.util.Set;

@Service
@RequiredArgsConstructor
public class FileAttachmentService {

    private static final Set<String> CAN_UPLOAD = Set.of(
            RoleNames.ADMIN, RoleNames.LIMITED_ADMIN, RoleNames.TECHNICIAN, RoleNames.LIMITED_TECHNICIAN);
    private static final long MAX_SIZE_BYTES = 20L * 1024 * 1024; // 20MB

    private final FileAttachmentRepository fileRepository;
    private final WorkOrderRepository workOrderRepository;
    private final AssetRepository assetRepository;
    private final com.tuempresa.cmms.repository.MeterRepository meterRepository;
    private final LocationRepository locationRepository;
    private final UserRepository userRepository;
    private final FileStorageService storageService;
    private final CurrentUserProvider currentUser;

    @Transactional
    public FileResponse upload(Long workOrderId, MultipartFile multipartFile) {
        requireRole(CAN_UPLOAD, "subir archivos");

        if (multipartFile.isEmpty()) {
            throw new ForbiddenOperationException("El archivo esta vacio.");
        }
        if (multipartFile.getSize() > MAX_SIZE_BYTES) {
            throw new ForbiddenOperationException("El archivo supera el limite de 20MB.");
        }

        WorkOrder wo = workOrderRepository.findById(workOrderId)
                .orElseThrow(() -> new ResourceNotFoundException("Work order no encontrado: id=" + workOrderId));
        User user = userRepository.findById(currentUser.userId())
                .orElseThrow(() -> new ResourceNotFoundException("Usuario no encontrado"));

        StoredFile stored = storageService.upload(multipartFile, "work-orders/" + workOrderId);

        FileAttachment file = new FileAttachment();
        file.setOrganizationId(currentUser.organizationId());
        file.setWorkOrder(wo);
        file.setFileName(multipartFile.getOriginalFilename());
        file.setStorageKey(stored.storageKey());
        file.setContentType(stored.contentType());
        file.setSizeBytes(stored.sizeBytes());
        file.setUploadedBy(user);

        return toResponse(fileRepository.save(file));
    }

    @Transactional(readOnly = true)
    public List<FileResponse> list(Long workOrderId) {
        return fileRepository.findByWorkOrderId(workOrderId).stream()
                .filter(f -> f.getComment() == null)
                .map(this::toResponse).toList();
    }

    @Transactional
    public FileResponse uploadForAsset(Long assetId, MultipartFile multipartFile) {
        requireRole(CAN_UPLOAD, "subir archivos");
        if (multipartFile.isEmpty()) throw new ForbiddenOperationException("El archivo esta vacio.");
        if (multipartFile.getSize() > MAX_SIZE_BYTES) throw new ForbiddenOperationException("El archivo supera el limite de 20MB.");

        Asset asset = assetRepository.findById(assetId)
                .orElseThrow(() -> new ResourceNotFoundException("Activo no encontrado: id=" + assetId));
        User user = userRepository.findById(currentUser.userId())
                .orElseThrow(() -> new ResourceNotFoundException("Usuario no encontrado"));

        StoredFile stored = storageService.upload(multipartFile, "assets/" + assetId);

        FileAttachment file = new FileAttachment();
        file.setOrganizationId(currentUser.organizationId());
        file.setAsset(asset);
        file.setFileName(multipartFile.getOriginalFilename());
        file.setStorageKey(stored.storageKey());
        file.setContentType(stored.contentType());
        file.setSizeBytes(stored.sizeBytes());
        file.setUploadedBy(user);

        return toResponse(fileRepository.save(file));
    }

    @Transactional(readOnly = true)
    public List<FileResponse> listForAsset(Long assetId) {
        return fileRepository.findByAssetId(assetId).stream().map(this::toResponse).toList();
    }

    @Transactional
    public FileResponse uploadForMeter(Long meterId, MultipartFile multipartFile) {
        requireRole(CAN_UPLOAD, "subir archivos");
        if (multipartFile.isEmpty()) throw new ForbiddenOperationException("El archivo esta vacio.");
        if (multipartFile.getSize() > MAX_SIZE_BYTES) throw new ForbiddenOperationException("El archivo supera el limite de 20MB.");

        com.tuempresa.cmms.model.entity.Meter meter = meterRepository.findById(meterId)
                .orElseThrow(() -> new ResourceNotFoundException("Medidor no encontrado: id=" + meterId));
        User user = userRepository.findById(currentUser.userId())
                .orElseThrow(() -> new ResourceNotFoundException("Usuario no encontrado"));

        StoredFile stored = storageService.upload(multipartFile, "meters/" + meterId);

        FileAttachment file = new FileAttachment();
        file.setOrganizationId(currentUser.organizationId());
        file.setMeter(meter);
        file.setFileName(multipartFile.getOriginalFilename());
        file.setStorageKey(stored.storageKey());
        file.setContentType(stored.contentType());
        file.setSizeBytes(stored.sizeBytes());
        file.setUploadedBy(user);

        return toResponse(fileRepository.save(file));
    }

    @Transactional
    public FileResponse uploadForLocation(Long locationId, MultipartFile multipartFile) {
        requireRole(CAN_UPLOAD, "subir archivos");
        if (multipartFile.isEmpty()) throw new ForbiddenOperationException("El archivo esta vacio.");
        if (multipartFile.getSize() > MAX_SIZE_BYTES) throw new ForbiddenOperationException("El archivo supera el limite de 20MB.");

        Location location = locationRepository.findById(locationId)
                .orElseThrow(() -> new ResourceNotFoundException("Ubicación no encontrada: id=" + locationId));
        User user = userRepository.findById(currentUser.userId())
                .orElseThrow(() -> new ResourceNotFoundException("Usuario no encontrado"));

        StoredFile stored = storageService.upload(multipartFile, "locations/" + locationId);

        FileAttachment file = new FileAttachment();
        file.setOrganizationId(currentUser.organizationId());
        file.setLocation(location);
        file.setFileName(multipartFile.getOriginalFilename());
        file.setStorageKey(stored.storageKey());
        file.setContentType(stored.contentType());
        file.setSizeBytes(stored.sizeBytes());
        file.setUploadedBy(user);

        return toResponse(fileRepository.save(file));
    }

    @Transactional(readOnly = true)
    public List<FileResponse> listForLocation(Long locationId) {
        return fileRepository.findByLocationId(locationId).stream().map(this::toResponse).toList();
    }

    @Transactional
    public void delete(Long fileId) {
        requireRole(Set.of(RoleNames.ADMIN), "eliminar archivos");
        FileAttachment file = fileRepository.findById(fileId)
                .orElseThrow(() -> new ResourceNotFoundException("Archivo no encontrado: id=" + fileId));
        storageService.delete(file.getStorageKey());
        fileRepository.delete(file);
    }

    private void requireRole(Set<String> allowedRoles, String action) {
        String role = currentUser.get().getRoleName();
        boolean allowed = role != null && allowedRoles.stream().anyMatch(r -> r.equalsIgnoreCase(role));
        if (!allowed) {
            throw new ForbiddenOperationException("Tu rol (" + role + ") no tiene permiso para " + action + ".");
        }
    }

    private FileResponse toResponse(FileAttachment file) {
        String url = storageService.getDownloadUrl(file.getStorageKey());
        String uploaderName = file.getUploadedBy() != null
                ? ((file.getUploadedBy().getFirstName() != null ? file.getUploadedBy().getFirstName() : "") + " "
                    + (file.getUploadedBy().getLastName() != null ? file.getUploadedBy().getLastName() : "")).trim()
                : null;
        return new FileResponse(
                file.getId(), file.getFileName(), url, file.getContentType(), file.getSizeBytes(),
                uploaderName, file.getCreatedAt());
    }
}
