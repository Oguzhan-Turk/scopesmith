package com.scopesmith.dto.enums;

import com.fasterxml.jackson.annotation.JsonCreator;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.util.Locale;

public enum RiskLevel {
    LOW, MEDIUM, HIGH;

    private static final Logger log = LoggerFactory.getLogger(RiskLevel.class);

    @JsonCreator
    public static RiskLevel fromString(String value) {
        if (value == null || value.isBlank()) return MEDIUM;
        try {
            return valueOf(value.toUpperCase(Locale.ENGLISH).trim());
        } catch (IllegalArgumentException e) {
            log.warn("Unknown risk level '{}', falling back to MEDIUM", value);
            return MEDIUM;
        }
    }
}
