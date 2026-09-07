package com.tuempresa.cmms.dto.response;

public record PartSummary(Long id, String name, String erpSku, Integer quantity, Double cost) {
}
