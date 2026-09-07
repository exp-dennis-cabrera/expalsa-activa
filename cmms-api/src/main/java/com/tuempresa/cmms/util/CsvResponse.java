package com.tuempresa.cmms.util;

import org.springframework.http.ResponseEntity;

import java.nio.charset.StandardCharsets;

/**
 * Construye la respuesta de descarga de un CSV.
 *
 * El detalle importante es el BOM (los 3 bytes EF BB BF al inicio): sin el,
 * Excel en Windows abre el archivo con la codificacion regional y las
 * tildes salen rotas -- "Recepcion" con tilde se ve como "RecepciA3n". El
 * BOM le dice a Excel "esto es UTF-8" y las tildes salen bien.
 *
 * Se devuelve como byte[] y no como String para que nadie vuelva a
 * convertir el texto por el camino y se pierda la codificacion.
 */
public final class CsvResponse {

    private static final byte[] BOM_UTF8 = new byte[]{(byte) 0xEF, (byte) 0xBB, (byte) 0xBF};

    private CsvResponse() {
    }

    public static ResponseEntity<byte[]> of(String csv, String filename) {
        byte[] contenido = csv.getBytes(StandardCharsets.UTF_8);
        byte[] conBom = new byte[BOM_UTF8.length + contenido.length];
        System.arraycopy(BOM_UTF8, 0, conBom, 0, BOM_UTF8.length);
        System.arraycopy(contenido, 0, conBom, BOM_UTF8.length, contenido.length);

        return ResponseEntity.ok()
                .header("Content-Disposition", "attachment; filename=" + filename)
                .header("Content-Type", "text/csv; charset=UTF-8")
                .body(conBom);
    }
}
