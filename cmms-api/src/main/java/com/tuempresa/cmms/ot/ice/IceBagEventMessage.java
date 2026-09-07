package com.tuempresa.cmms.ot.ice;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;

@JsonIgnoreProperties(ignoreUnknown = true)
public record IceBagEventMessage(

    @JsonProperty("schema_version")
    int schemaVersion,

    @JsonProperty("asset_key")
    String assetKey,

    @JsonProperty("event_id")
    String eventId,

    @JsonProperty("message_id")
    String messageId,

    @JsonProperty("quality_code")
    int qualityCode,

    @JsonProperty("started_at")
    String startedAt,

    @JsonProperty("peak_at")
    String peakAt,

    @JsonProperty("removed_at")
    String removedAt,

    @JsonProperty("peak_weight_kg")
    Double peakWeightKg,

    @JsonProperty("raw_peak_weight_kg")
    Double rawPeakWeightKg,

    @JsonProperty("event_weight_kg")
    Double eventWeightKg,

    @JsonProperty("kg_to_lb_factor")
    Double kgToLbFactor,

    @JsonProperty("target_weight_lb")
    Double targetWeightLb,

    @JsonProperty("weight_method")
    String weightMethod

) {

    public Double weightLb() {

        if (
            eventWeightKg == null
            || kgToLbFactor == null
            || !Double.isFinite(eventWeightKg)
            || !Double.isFinite(kgToLbFactor)
            || eventWeightKg < 0.0d
            || kgToLbFactor <= 0.0d
        ) {
            return null;
        }

        return eventWeightKg * kgToLbFactor;
    }
}
