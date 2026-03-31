package com.scopesmith.config;

import com.scopesmith.entity.ModelTier;
import lombok.Data;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;
import java.math.BigDecimal;
import java.util.Locale;
import java.util.Map;

/**
 * Reads AI model names and pricing from application.yml.
 * Allows runtime configuration without code changes.
 */
@Component
@ConfigurationProperties(prefix = "scopesmith")
@Data
@Slf4j
public class ModelProperties {

    private Map<String, String> models;
    private Map<String, PricingEntry> pricing;

    @Data
    public static class PricingEntry {
        private BigDecimal inputPerMillion;
        private BigDecimal outputPerMillion;
    }

    public String getModelName(ModelTier tier) {
        if (models == null) return "claude-sonnet-4-20250514";
        String key = tier.name().toLowerCase(Locale.ENGLISH);
        return models.getOrDefault(key, models.getOrDefault("standard", "claude-sonnet-4-20250514"));
    }

    public PricingEntry getPricing(ModelTier tier) {
        if (pricing == null) return defaultPricing();
        String key = tier.name().toLowerCase(Locale.ENGLISH);
        return pricing.getOrDefault(key, defaultPricing());
    }

    /**
     * Resolve tier from a model name string (e.g., from ChatResponse metadata).
     */
    public ModelTier resolveTier(String modelName) {
        if (models == null || modelName == null) return ModelTier.STANDARD;
        for (Map.Entry<String, String> entry : models.entrySet()) {
            if (modelName.contains(entry.getValue()) || entry.getValue().contains(modelName)) {
                try { return ModelTier.valueOf(entry.getKey().toUpperCase(java.util.Locale.ENGLISH)); }
                catch (Exception ignored) {}
            }
        }
        return ModelTier.STANDARD;
    }

    private PricingEntry defaultPricing() {
        PricingEntry entry = new PricingEntry();
        entry.setInputPerMillion(new BigDecimal("3.00"));
        entry.setOutputPerMillion(new BigDecimal("15.00"));
        return entry;
    }
}
