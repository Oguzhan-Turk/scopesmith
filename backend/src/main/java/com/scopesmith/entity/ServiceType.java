package com.scopesmith.entity;

import com.fasterxml.jackson.annotation.JsonCreator;

import java.util.Locale;
import java.util.Map;

/**
 * High-level classification of a workspace service.
 *
 * <ul>
 *   <li>{@code BACKEND}  — server-side: APIs, workers, gateways, data pipelines, infra</li>
 *   <li>{@code FRONTEND} — client-side: web, mobile, desktop applications</li>
 *   <li>{@code LIBRARY}  — shared, non-deployable code (SDKs, utils, proto definitions)</li>
 *   <li>{@code OTHER}    — anything that doesn't fit the above</li>
 * </ul>
 *
 * <p>Previously 8 types (BACKEND, FRONTEND, MOBILE, GATEWAY, DATA, PLATFORM, SHARED, OTHER).
 * The {@link #fromValue(String)} factory maps legacy values so existing DB rows keep working.
 */
public enum ServiceType {
    BACKEND,
    FRONTEND,
    LIBRARY,
    OTHER;

    /** Legacy value → canonical mapping. */
    private static final Map<String, ServiceType> LEGACY = Map.of(
            "MOBILE",   FRONTEND,
            "GATEWAY",  BACKEND,
            "DATA",     BACKEND,
            "PLATFORM", BACKEND,
            "SHARED",   LIBRARY
    );

    @JsonCreator
    public static ServiceType fromValue(String value) {
        if (value == null) return OTHER;
        String upper = value.trim().toUpperCase(Locale.ENGLISH);
        try {
            return valueOf(upper);
        } catch (IllegalArgumentException e) {
            ServiceType mapped = LEGACY.get(upper);
            if (mapped != null) return mapped;
            return OTHER;
        }
    }
}
