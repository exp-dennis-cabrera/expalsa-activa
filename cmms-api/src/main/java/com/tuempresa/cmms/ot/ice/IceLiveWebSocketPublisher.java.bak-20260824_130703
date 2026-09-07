package com.tuempresa.cmms.ot.ice;

import lombok.RequiredArgsConstructor;

import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class IceLiveWebSocketPublisher {

    private static final String DESTINATION =
        "/ot/ice/live";

    private final SimpMessagingTemplate messagingTemplate;


    public void publish(
        IceLiveMessage message
    ) {

        if (
            message == null
            || message.getAssetKey() == null
        ) {
            return;
        }

        double weightLb =
            message.getWeightLb();

        Double progressPct = null;

        if (message.getTargetWeightLb() > 0.0d) {

            progressPct =
                Math.max(
                    0.0d,
                    Math.min(
                        100.0d,
                        (
                            weightLb
                            / message.getTargetWeightLb()
                        )
                        * 100.0d
                    )
                );
        }

        IceLivePayload payload =
            new IceLivePayload(
                "weight",
                message.getAssetKey(),
                message.getTs(),
                message.getWeightKg(),
                weightLb,
                message.getTargetWeightLb(),
                progressPct,
                message.getDetectorState(),
                message.getQualityCode(),
                message.getCollectionDurationMs()
            );

        messagingTemplate.convertAndSend(
            DESTINATION,
            payload
        );
    }


    /*
     * Contrato pensado para React.
     *
     * No exponemos MQTT, credenciales, PLC,
     * sample internals ni detalles de infraestructura.
     */
    public record IceLivePayload(
        String type,
        String assetKey,
        String ts,
        double weightKg,
        double weightLb,
        double targetLb,
        Double progressPct,
        String detectorState,
        int qualityCode,
        long collectionDurationMs
    ) {
    }
}
