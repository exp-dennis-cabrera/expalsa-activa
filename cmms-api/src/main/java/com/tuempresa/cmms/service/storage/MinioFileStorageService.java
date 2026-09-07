package com.tuempresa.cmms.service.storage;

import io.minio.GetPresignedObjectUrlArgs;
import io.minio.MinioClient;
import io.minio.PutObjectArgs;
import io.minio.RemoveObjectArgs;
import io.minio.http.Method;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.InputStream;
import java.util.UUID;
import java.util.concurrent.TimeUnit;

@Service
@RequiredArgsConstructor
public class MinioFileStorageService implements FileStorageService {

    private final MinioClient minioClient;


    @Value("${storage.bucket}")
    private String bucket;

    /** Direccion con la que el BACKEND habla con MinIO (dentro de Docker). */
    @Value("${storage.endpoint}")
    private String endpoint;

    /** Direccion con la que el NAVEGADOR alcanza MinIO (a traves de Caddy). */
    @Value("${storage.public-endpoint:}")
    private String publicEndpoint;



    @Override
    public StoredFile upload(MultipartFile file, String keyPrefix) {
        String key = keyPrefix + "/" + UUID.randomUUID() + "-" + sanitize(file.getOriginalFilename());
        try (InputStream is = file.getInputStream()) {
            minioClient.putObject(PutObjectArgs.builder()
                    .bucket(bucket)
                    .object(key)
                    .stream(is, file.getSize(), -1)
                    .contentType(file.getContentType())
                    .build());
        } catch (Exception e) {
            throw new RuntimeException("Error subiendo archivo a MinIO: " + e.getMessage(), e);
        }
        return new StoredFile(key, file.getContentType(), file.getSize());
    }

    @Override
    public String getDownloadUrl(String storageKey) {
        try {
            // Mismo enfoque que MinioService real: se firma con la direccion
            // INTERNA y despues se reescribe el prefijo por el publico.
            //
            // La firma incluye el host, asi que MinIO solo la acepta si la
            // peticion le llega con el host interno. De eso se encarga el
            // proxy: Caddy reescribe el encabezado Host a "minio:9000"
            // antes de reenviar (ver "header_up Host" en el Caddyfile).
            // Sin esa linea, MinIO responde "SignatureDoesNotMatch".
            String internalUrl = minioClient.getPresignedObjectUrl(GetPresignedObjectUrlArgs.builder()
                    .method(Method.GET)
                    .bucket(bucket)
                    .object(storageKey)
                    .expiry(1, TimeUnit.HOURS)
                    .build());
            if (publicEndpoint != null && !publicEndpoint.isEmpty()) {
                return internalUrl.replace(endpoint, publicEndpoint);
            }
            return internalUrl;
        } catch (Exception e) {
            throw new RuntimeException("Error generando URL de descarga: " + e.getMessage(), e);
        }
    }

    @Override
    public void delete(String storageKey) {
        try {
            minioClient.removeObject(RemoveObjectArgs.builder()
                    .bucket(bucket)
                    .object(storageKey)
                    .build());
        } catch (Exception e) {
            throw new RuntimeException("Error eliminando archivo: " + e.getMessage(), e);
        }
    }

    private String sanitize(String fileName) {
        return fileName == null ? "archivo" : fileName.replaceAll("[^a-zA-Z0-9._-]", "_");
    }
}
