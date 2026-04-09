-- V2: Seed data — demo users for development

-- admin/admin123 (BCrypt)
INSERT INTO app_users (username, password_hash, role)
VALUES ('admin', '$2a$10$h9FZlXtRYImV4bdXsOCfQONddyQnedqtUwGuISyysVq7x165GLWwK', 'ADMIN')
ON CONFLICT (username) DO NOTHING;

-- user/user123 (BCrypt)
INSERT INTO app_users (username, password_hash, role)
VALUES ('user', '$2a$10$IoP/xEaVc24O591CLRE/HeR9T3NtCEATt/2BxoRPRp.Aa0U.4/moa', 'USER')
ON CONFLICT (username) DO NOTHING;
