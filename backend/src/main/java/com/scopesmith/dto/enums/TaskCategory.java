package com.scopesmith.dto.enums;

import com.fasterxml.jackson.annotation.JsonCreator;

import java.util.Locale;

public enum TaskCategory {
    BACKEND, FRONTEND, MOBILE, DATABASE, DEVOPS, TESTING, FULLSTACK, OTHER;

    @JsonCreator
    public static TaskCategory fromString(String value) {
        if (value == null || value.isBlank()) return OTHER;
        try {
            return valueOf(value.toUpperCase(Locale.ENGLISH).trim());
        } catch (IllegalArgumentException e) {
            return OTHER;
        }
    }
}
