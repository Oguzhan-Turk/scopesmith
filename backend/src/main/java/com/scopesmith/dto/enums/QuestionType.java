package com.scopesmith.dto.enums;

import com.fasterxml.jackson.annotation.JsonCreator;

import java.util.Locale;

public enum QuestionType {
    OPEN, SINGLE_CHOICE, MULTIPLE_CHOICE;

    @JsonCreator
    public static QuestionType fromString(String value) {
        if (value == null || value.isBlank()) return OPEN;
        try {
            return valueOf(value.toUpperCase(Locale.ENGLISH).trim());
        } catch (IllegalArgumentException e) {
            return OPEN;
        }
    }
}
