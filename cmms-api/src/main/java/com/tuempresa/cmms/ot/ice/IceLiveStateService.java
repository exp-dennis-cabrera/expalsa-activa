package com.tuempresa.cmms.ot.ice;

import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

@Service
public class IceLiveStateService {

    public record LiveState(
        IceLiveMessage message,
        Instant receivedAt
    ) {
    }

    private final Map<String, LiveState> latest =
        new ConcurrentHashMap<>();

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
        return Map.copyOf(latest);
    }
}
