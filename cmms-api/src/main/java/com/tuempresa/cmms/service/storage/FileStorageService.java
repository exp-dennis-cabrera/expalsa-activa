package com.tuempresa.cmms.service.storage;

import org.springframework.web.multipart.MultipartFile;

/**
 * Abstraccion de storage, igual que hace Atlas (soporta MinIO o GCS
 * intercambiables via STORAGE_TYPE). Por ahora solo implementamos MinIO,
 * pero el resto de la app depende de esta interfaz, no de MinIO directamente.
 */
public interface FileStorageService {

    StoredFile upload(MultipartFile file, String keyPrefix);

    String getDownloadUrl(String storageKey);

    void delete(String storageKey);
}
