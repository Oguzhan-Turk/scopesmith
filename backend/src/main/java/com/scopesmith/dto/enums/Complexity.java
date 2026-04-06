package com.scopesmith.dto.enums;

import com.fasterxml.jackson.annotation.JsonCreator;

import java.util.Locale;

public enum Complexity {
    LOW, MEDIUM, HIGH;

    @JsonCreator
    public static Complexity fromString(String value) {
        if (value == null || value.isBlank()) return MEDIUM;
        try {
            return valueOf(value.toUpperCase(Locale.ENGLISH).trim());
        } catch (IllegalArgumentException e) {
            return MEDIUM;
        }
    }
}
