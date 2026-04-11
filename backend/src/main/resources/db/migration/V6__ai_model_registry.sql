CREATE TABLE ai_model_configs (
    id BIGSERIAL PRIMARY KEY,
    tier VARCHAR(20) NOT NULL UNIQUE,
    provider VARCHAR(50) NOT NULL,
    model_name VARCHAR(255) NOT NULL,
    active BOOLEAN NOT NULL DEFAULT TRUE,
    input_per_million NUMERIC(10, 2),
    output_per_million NUMERIC(10, 2),
    latency_class VARCHAR(20),
    quality_class VARCHAR(20),
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO ai_model_configs (
    tier, provider, model_name, active, input_per_million, output_per_million, latency_class, quality_class
) VALUES
    ('LIGHT', 'ANTHROPIC', 'claude-haiku-4-5-20251001', TRUE, 1.00, 5.00, 'FAST', 'GOOD'),
    ('STANDARD', 'ANTHROPIC', 'claude-sonnet-4-20250514', TRUE, 3.00, 15.00, 'MEDIUM', 'HIGH'),
    ('PREMIUM', 'ANTHROPIC', 'claude-opus-4-6', TRUE, 5.00, 25.00, 'SLOW', 'MAX');
