package com.scopesmith.entity;

/**
 * Role within a specific project.
 * OWNER: full control (create, edit, delete, manage members)
 * EDITOR: analyze, create tasks, sync
 * VIEWER: read-only access
 */
public enum ProjectRole {
    OWNER,
    EDITOR,
    VIEWER
}
