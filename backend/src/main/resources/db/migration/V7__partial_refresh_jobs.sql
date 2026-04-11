CREATE TABLE partial_refresh_jobs (
    id BIGSERIAL PRIMARY KEY,
    project_id BIGINT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    status VARCHAR(20) NOT NULL,
    recommendation VARCHAR(30),
    total_analyses INT NOT NULL DEFAULT 0,
    processed_analyses INT NOT NULL DEFAULT 0,
    refreshed_count INT NOT NULL DEFAULT 0,
    refreshed_requirement_ids JSONB,
    error TEXT,
    started_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_partial_refresh_jobs_project_created
    ON partial_refresh_jobs(project_id, created_at DESC);

CREATE INDEX idx_partial_refresh_jobs_project_status
    ON partial_refresh_jobs(project_id, status);
