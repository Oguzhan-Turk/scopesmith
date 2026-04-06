package com.scopesmith.dto.enums;

import com.fasterxml.jackson.annotation.JsonCreator;

import java.util.Locale;

public enum FeatureCategory {
    ENHANCEMENT, NEW_FEATURE, PERFORMANCE, SECURITY, UX, INTEGRATION, OTHER;

    @JsonCreator
    public static FeatureCategory fromString(String value) {
        if (value == null || value.isBlank()) return OTHER;
        try {
            return valueOf(value.toUpperCase(Locale.ENGLISH).trim());
        } catch (IllegalArgumentException e) {
            return OTHER;
        }
    }
}
