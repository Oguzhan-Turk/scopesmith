-- Managed Agent preview: task-level agent tracking fields
ALTER TABLE tasks ADD COLUMN agent_session_id VARCHAR(255);
ALTER TABLE tasks ADD COLUMN agent_status VARCHAR(50);
ALTER TABLE tasks ADD COLUMN agent_branch VARCHAR(255);
