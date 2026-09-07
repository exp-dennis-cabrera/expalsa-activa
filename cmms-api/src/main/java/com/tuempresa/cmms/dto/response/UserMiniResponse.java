package com.tuempresa.cmms.dto.response;

/** Copia fiel de UserMiniDTO real: id, nombre y correo, para selectores livianos. */
public record UserMiniResponse(Long id, String fullName, String email) {
}
