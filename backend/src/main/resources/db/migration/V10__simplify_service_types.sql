-- Consolidate 8 service types down to 4: BACKEND, FRONTEND, LIBRARY, OTHER
-- Legacy values are mapped to their canonical equivalents.

UPDATE project_services SET service_type = 'FRONTEND' WHERE service_type = 'MOBILE';
UPDATE project_services SET service_type = 'BACKEND'  WHERE service_type = 'GATEWAY';
UPDATE project_services SET service_type = 'BACKEND'  WHERE service_type = 'DATA';
UPDATE project_services SET service_type = 'BACKEND'  WHERE service_type = 'PLATFORM';
UPDATE project_services SET service_type = 'LIBRARY'  WHERE service_type = 'SHARED';
