package com.tuempresa.cmms.ot.ice;

import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.Collections;
import java.util.LinkedHashMap;
import java.util.Map;

@Service
public class IceLiveStateService {

    public record LiveState(
        IceLiveMessage message,
        Instant receivedAt
    ) {
    }

    /*
     * El assetKey viene del payload MQTT, no de una lista blanca:
     * cualquier publicador del topic puede inventar claves nuevas.
     *
     * Se acota por cantidad de entradas y no por tiempo:
     *
     * - Un tope de entradas es un limite duro de memoria, no depende
     *   del ritmo al que lleguen claves nuevas. Una expiracion por
     *   tiempo solo acota la memoria si ademas se asume un caudal
     *   acotado de mensajes: mil claves distintas por segundo dentro
     *   de la ventana TTL crecen igual.
     * - Con orden de acceso (LRU) los activos reales, que publican
     *   cada pocos segundos, quedan siempre entre los mas recientes;
     *   las claves inyectadas se usan una vez y son las primeras en
     *   caer.
     * - La antiguedad de un dato ya se expone en receivedAt, asi que
     *   el consumidor puede descartar lecturas viejas por su cuenta.
     *   Borrarlas por tiempo aca haria desaparecer del mapa a un
     *   activo simplemente detenido, que es informacion util.
     *
     * 512 deja margen de sobra: la planta tiene unas pocas basculas.
     */
    private static final int MAX_ASSETS = 512;

    private final Map<String, LiveState> latest =
        Collections.synchronizedMap(
            new LinkedHashMap<String, LiveState>(
                64,
                0.75f,
                true
            ) {
                @Override
                protected boolean removeEldestEntry(
                    Map.Entry<String, LiveState> eldest
                ) {
                    return size() > MAX_ASSETS;
                }
            }
        );

    public void update(IceLiveMessage message) {

        if (
            message == null
            || message.getAssetKey() == null
            || message.getAssetKey().isBlank()
        ) {
            return;
        }

        latest.put(
            message.getAssetKey(),
            new LiveState(
                message,
                Instant.now()
            )
        );
    }

    public LiveState getLatest(String assetKey) {
        return latest.get(assetKey);
    }

    public Map<String, LiveState> getAll() {
        synchronized (latest) {
            return Map.copyOf(latest);
        }
    }
}
