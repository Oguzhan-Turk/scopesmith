package com.scopesmith.config;

import com.scopesmith.dto.enums.RiskLevel;
import jakarta.persistence.AttributeConverter;
import jakarta.persistence.Converter;
import lombok.extern.slf4j.Slf4j;

import java.util.Locale;

/**
 * JPA converter for RiskLevel enum — handles unknown/Turkish values from DB gracefully.
 * Falls back to MEDIUM instead of throwing IllegalArgumentException.
 */
@Converter(autoApply = true)
@Slf4j
public class RiskLevelConverter implements AttributeConverter<RiskLevel, String> {

    @Override
    public String convertToDatabaseColumn(RiskLevel attribute) {
        return attribute != null ? attribute.name() : "MEDIUM";
    }

    @Override
    public RiskLevel convertToEntityAttribute(String dbData) {
        if (dbData == null || dbData.isBlank()) return RiskLevel.MEDIUM;
        try {
            return RiskLevel.valueOf(dbData.toUpperCase(Locale.ENGLISH).trim());
        } catch (IllegalArgumentException e) {
            log.warn("Unknown risk level in DB: '{}', falling back to MEDIUM", dbData);
            return RiskLevel.MEDIUM;
        }
    }
}
