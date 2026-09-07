package com.tuempresa.cmms.ot.ice;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;

@JsonIgnoreProperties(ignoreUnknown = true)
public class IceLiveMessage {

    @JsonProperty("schema_version")
    private int schemaVersion;

    @JsonProperty("asset_key")
    private String assetKey;

    @JsonProperty("sample_id")
    private String sampleId;

    private String ts;

    @JsonProperty("collected_at")
    private String collectedAt;

    @JsonProperty("quality_code")
    private int qualityCode;

    @JsonProperty("weight_kg")
    private double weightKg;

    @JsonProperty("target_weight_lb")
    private double targetWeightLb;

    @JsonProperty("detector_state")
    private String detectorState;

    @JsonProperty("collection_duration_ms")
    private long collectionDurationMs;

    public int getSchemaVersion() {
        return schemaVersion;
    }

    public String getAssetKey() {
        return assetKey;
    }

    public String getSampleId() {
        return sampleId;
    }

    public String getTs() {
        return ts;
    }

    public String getCollectedAt() {
        return collectedAt;
    }

    public int getQualityCode() {
        return qualityCode;
    }

    public double getWeightKg() {
        return weightKg;
    }

    public double getTargetWeightLb() {
        return targetWeightLb;
    }

    public String getDetectorState() {
        return detectorState;
    }

    public long getCollectionDurationMs() {
        return collectionDurationMs;
    }

    public double getWeightLb() {
        return weightKg * 2.205d;
    }
}
