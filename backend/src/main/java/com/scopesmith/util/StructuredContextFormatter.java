package com.scopesmith.util;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.scopesmith.dto.DependencyInfo;
import com.scopesmith.dto.ProjectContextResult;
import lombok.extern.slf4j.Slf4j;

import java.util.List;
import java.util.stream.Collectors;

@Slf4j
public final class StructuredContextFormatter {

    private static final ObjectMapper objectMapper = new ObjectMapper();

    private StructuredContextFormatter() {}

    /**
     * Formats the project's structured context JSONB into a readable markdown section
     * for injection into AI prompts. Returns empty string if no structured context.
     */
    public static String format(String structuredContextJson) {
        if (structuredContextJson == null || structuredContextJson.isBlank()) return "";

        try {
            ProjectContextResult ctx = objectMapper.readValue(structuredContextJson, ProjectContextResult.class);
            StringBuilder sb = new StringBuilder();
            sb.append("## Project Architecture (Structured)\n\n");

            // Tech Stack
            if (ctx.getTechStack() != null) {
                var ts = ctx.getTechStack();
                sb.append("### Tech Stack\n");
                appendList(sb, "Languages", ts.getLanguages());
                appendList(sb, "Frameworks", ts.getFrameworks());
                appendList(sb, "Databases", ts.getDatabases());
                appendList(sb, "Build Tools", ts.getBuildTools());
                sb.append("\n");
            }

            // Architecture
            if (ctx.getArchitecturePattern() != null && !ctx.getArchitecturePattern().isBlank()) {
                sb.append("### Architecture\n");
                sb.append("Pattern: ").append(ctx.getArchitecturePattern()).append("\n");
                if (ctx.getArchitectureDescription() != null && !ctx.getArchitectureDescription().isBlank()) {
                    sb.append(ctx.getArchitectureDescription()).append("\n");
                }
                sb.append("\n");
            }

            // Modules
            if (ctx.getModules() != null && !ctx.getModules().isEmpty()) {
                sb.append("### Modules\n");
                for (var m : ctx.getModules()) {
                    sb.append("- **").append(m.getName()).append("**");
                    if (m.getDescription() != null && !m.getDescription().isBlank()) {
                        sb.append(": ").append(m.getDescription());
                    }
                    sb.append("\n");
                }
                sb.append("\n");
            }

            // Entities
            if (ctx.getEntities() != null && !ctx.getEntities().isEmpty()) {
                sb.append("### Entities\n");
                for (var e : ctx.getEntities()) {
                    sb.append("- **").append(e.getName()).append("**");
                    if (e.getDescription() != null && !e.getDescription().isBlank()) {
                        sb.append(": ").append(e.getDescription());
                    }
                    if (e.getRelationships() != null && !e.getRelationships().isEmpty()) {
                        sb.append(" (").append(String.join(", ", e.getRelationships())).append(")");
                    }
                    sb.append("\n");
                }
                sb.append("\n");
            }

            // API Endpoints
            if (ctx.getApiEndpoints() != null && !ctx.getApiEndpoints().isEmpty()) {
                sb.append("### API Endpoints\n");
                for (String ep : ctx.getApiEndpoints()) {
                    sb.append("- ").append(ep).append("\n");
                }
                sb.append("\n");
            }

            // External Integrations
            if (ctx.getExternalIntegrations() != null && !ctx.getExternalIntegrations().isEmpty()) {
                sb.append("### External Integrations\n");
                for (String ei : ctx.getExternalIntegrations()) {
                    sb.append("- ").append(ei).append("\n");
                }
                sb.append("\n");
            }

            // Dependencies
            if (ctx.getDependencies() != null && !ctx.getDependencies().isEmpty()) {
                sb.append("### Key Dependencies\n");
                // Group by scope
                var byScope = ctx.getDependencies().stream()
                    .collect(Collectors.groupingBy(
                        d -> d.getScope() != null ? d.getScope() : "COMPILE"
                    ));

                // Show compile deps first (most important)
                var compileDeps = byScope.getOrDefault("COMPILE", List.of());
                if (!compileDeps.isEmpty()) {
                    for (var d : compileDeps) {
                        sb.append("- ");
                        if (d.getGroup() != null) sb.append(d.getGroup()).append(":");
                        sb.append(d.getName());
                        if (d.getVersion() != null) sb.append(":").append(d.getVersion());
                        sb.append("\n");
                    }
                }

                // Show test deps separately
                var testDeps = byScope.getOrDefault("TEST", List.of());
                if (!testDeps.isEmpty()) {
                    sb.append("Test: ");
                    sb.append(testDeps.stream()
                        .map(DependencyInfo::getName)
                        .collect(Collectors.joining(", ")));
                    sb.append("\n");
                }

                // Show dev deps separately
                var devDeps = byScope.getOrDefault("DEV", List.of());
                if (!devDeps.isEmpty()) {
                    sb.append("Dev: ");
                    sb.append(devDeps.stream()
                        .map(DependencyInfo::getName)
                        .collect(Collectors.joining(", ")));
                    sb.append("\n");
                }
                sb.append("\n");
            }

            String result = sb.toString().trim();
            return result.isEmpty() ? "" : result + "\n\n";
        } catch (Exception e) {
            log.warn("Failed to format structured context: {}", e.getMessage());
            return "";
        }
    }

    private static void appendList(StringBuilder sb, String label, List<String> items) {
        if (items != null && !items.isEmpty()) {
            sb.append("- ").append(label).append(": ").append(String.join(", ", items)).append("\n");
        }
    }
}
