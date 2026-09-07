package com.tuempresa.cmms.service.storage;

public record StoredFile(String storageKey, String contentType, Long sizeBytes) {
}
