package com.scopesmith.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.scopesmith.dto.ProjectContextResult;
import com.scopesmith.entity.Project;
import com.scopesmith.service.ContextResolutionService.ResolvedContext;
import com.scopesmith.util.StructuredContextFormatter;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.lang.Nullable;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Locale;

/**
 * Builds the project-context portion of AI prompt messages.
 *
 * <p>Consolidates the repeated three-block pattern that used to appear in every
 * AI service ({@code ## Project Context}, structured context, {@code ## Project Developer Notes}),
 * and transparently extends it with workspace service contexts for multi-service projects.
 *
 * <p>Usage in any AI service:
 * <pre>{@code
 *   StringBuilder message = new StringBuilder();
 *   message.append(promptContextBuilder.buildContextBlock(project));
 *   message.append("## Raw Requirement\n").append(requirement.getRawText());
 * }</pre>
 *
 * <p>The method is intentionally side-effect free — it only reads resolved context
 * and formats it as a markdown string. Transaction behaviour is the caller's concern.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class PromptContextBuilder {

    private final ContextResolutionService contextResolutionService;
    private final ObjectMapper objectMapper;

    /**
     * Hard cap on the number of workspace services injected into any single prompt.
     * Applies after relevance filtering — if more relevant services exist than this limit,
     * the first N (alphabetically) are used and the rest are noted.
     */
    private static final int MAX_SERVICES_IN_PROMPT = 5;

    /**
     * Per-service techContext character limit (~750 tokens at ~4 chars/token).
     * The full context lives in the DB; the prompt gets a trimmed summary.
     */
    private static final int MAX_SERVICE_CONTEXT_CHARS = 3_000;

    // ─── Public API ──────────────────────────────────────────────────────────

    /**
     * Build the context block without affected-module information.
     * Used when modules are not yet known (first-time analysis, feature suggestions).
     * All scanned services are candidates, subject to {@link #MAX_SERVICES_IN_PROMPT}.
     */
    public String buildContextBlock(Project project) {
        return buildContextBlock(project, null);
    }

    /**
     * Build the context block with relevance filtering based on {@code affectedModules}.
     *
     * <p>When {@code affectedModules} is non-empty, only workspace services that are
     * demonstrably related to those modules are included. Relevance is determined by:
     * <ol>
     *   <li>Service name substring-matches any affected module name, OR</li>
     *   <li>The service's structured-context module list overlaps with affected modules.</li>
     * </ol>
     * If no services pass the filter (e.g. single-repo project, or modules are too generic),
     * the result is the same as calling {@link #buildContextBlock(Project)}.
     *
     * @param project         the project whose context to build
     * @param affectedModules comma-separated module string from {@code Analysis.affectedModules},
     *                        or {@code null} / blank to disable filtering
     */
    public String buildContextBlock(Project project, @Nullable String affectedModules) {
        ResolvedContext ctx = contextResolutionService.resolve(project);
        StringBuilder sb = new StringBuilder();

        // Block 1 — free-text tech context
        if (ctx.techContext() != null && !ctx.techContext().isBlank()) {
            sb.append("## Project Context\n");
            sb.append(ctx.techContext());
            sb.append("\n\n");
        }

        // Block 2 — structured context (modules, entities, tech stack, endpoints, …)
        String structuredSection = StructuredContextFormatter.format(ctx.structuredContext());
        if (!structuredSection.isEmpty()) {
            sb.append(structuredSection);
        }

        // Block 3 — CLAUDE.md developer notes
        if (ctx.claudeMdContent() != null && !ctx.claudeMdContent().isBlank()) {
            sb.append("## Project Developer Notes (CLAUDE.md)\n");
            sb.append(ctx.claudeMdContent());
            sb.append("\n\n");
        }

        // Block 4 — workspace service contexts (multi-service projects only)
        if (ctx.hasServiceContexts()) {
            appendServiceContexts(sb, project, ctx, affectedModules);
        }

        return sb.toString();
    }

    // ─── Private helpers ─────────────────────────────────────────────────────

    private void appendServiceContexts(StringBuilder sb, Project project,
                                       ResolvedContext ctx, @Nullable String affectedModules) {
        List<String> moduleList = parseModules(affectedModules);
        boolean filtering = !moduleList.isEmpty();

        List<ResolvedContext.ServiceContext> candidates = filtering
                ? ctx.serviceContexts().stream()
                     .filter(svc -> isServiceRelevant(svc, moduleList))
                     .toList()
                : ctx.serviceContexts();

        if (candidates.isEmpty()) {
            // Filtering produced no matches — fall back to all services so we never silently drop context
            log.debug("Project #{} — relevance filter matched 0 services for modules {}; falling back to all",
                      project.getId(), moduleList);
            candidates = ctx.serviceContexts();
        }

        int total    = candidates.size();
        int included = Math.min(total, MAX_SERVICES_IN_PROMPT);
        int skipped  = ctx.serviceContexts().size() - total; // filtered out by relevance

        if (filtering && skipped > 0) {
            log.debug("Project #{} — relevance filter excluded {} service(s) for modules {}",
                      project.getId(), skipped, moduleList);
        }
        if (total > MAX_SERVICES_IN_PROMPT) {
            log.warn("Project #{} has {} relevant services; only {} fit in the prompt cap. " +
                     "Consider reviewing MAX_SERVICES_IN_PROMPT.",
                     project.getId(), total, MAX_SERVICES_IN_PROMPT);
        }

        sb.append("## Workspace Services (").append(included).append("/")
          .append(ctx.serviceContexts().size()).append(" service(s) included");
        if (filtering) sb.append(", filtered by affected modules");
        sb.append(")\n\n");

        candidates.stream().limit(MAX_SERVICES_IN_PROMPT).forEach(svc -> {
            sb.append("### Service: ").append(svc.name()).append("\n");

            if (svc.techContext() != null && !svc.techContext().isBlank()) {
                String text = svc.techContext();
                if (text.length() > MAX_SERVICE_CONTEXT_CHARS) {
                    text = text.substring(0, MAX_SERVICE_CONTEXT_CHARS)
                           + "\n_(truncated — full context stored in DB)_";
                    log.debug("Service '{}' techContext truncated from {} to {} chars",
                              svc.name(), svc.techContext().length(), MAX_SERVICE_CONTEXT_CHARS);
                }
                sb.append(text).append("\n\n");
            }

            String svcStructured = StructuredContextFormatter.format(svc.structuredContext());
            if (!svcStructured.isEmpty()) {
                sb.append(svcStructured);
            }
        });

        if (total > MAX_SERVICES_IN_PROMPT) {
            sb.append("_(").append(total - MAX_SERVICES_IN_PROMPT)
              .append(" additional relevant service(s) omitted from prompt to stay within token budget)_\n\n");
        }
    }

    /**
     * Determine whether a service is relevant to the given list of affected modules.
     *
     * <p>Two-pass check:
     * <ol>
     *   <li>Service <em>name</em> substring-matches any module name (cheap, no JSON parsing).</li>
     *   <li>Service's structured-context <em>module list</em> overlaps with affected modules
     *       (requires one JSON parse per service, cached by the JVM object lifecycle).</li>
     * </ol>
     */
    private boolean isServiceRelevant(ResolvedContext.ServiceContext svc, List<String> affectedModules) {
        String svcNameLower = svc.name().toLowerCase(Locale.ENGLISH);

        // Pass 1 — name match (O(n), no I/O)
        for (String module : affectedModules) {
            String modLower = module.toLowerCase(Locale.ENGLISH);
            if (svcNameLower.contains(modLower) || modLower.contains(svcNameLower)) {
                return true;
            }
        }

        // Pass 2 — structured-context module overlap (requires JSON parse)
        if (svc.structuredContext() != null) {
            try {
                ProjectContextResult ctx = objectMapper.readValue(
                        svc.structuredContext(), ProjectContextResult.class);
                if (ctx.getModules() != null) {
                    for (ProjectContextResult.ModuleInfo m : ctx.getModules()) {
                        if (m.getName() == null) continue;
                        String mLower = m.getName().toLowerCase(Locale.ENGLISH);
                        for (String module : affectedModules) {
                            String modLower = module.toLowerCase(Locale.ENGLISH);
                            if (mLower.contains(modLower) || modLower.contains(mLower)) {
                                return true;
                            }
                        }
                    }
                }
            } catch (Exception e) {
                log.debug("Could not parse structured context for service '{}' during relevance check: {}",
                          svc.name(), e.getMessage());
            }
        }

        return false;
    }

    /**
     * Parse a comma-separated module string (as stored in {@code Analysis.affectedModules})
     * into a trimmed, non-empty list. Returns an empty list if input is null/blank.
     */
    private static List<String> parseModules(@Nullable String affectedModules) {
        if (affectedModules == null || affectedModules.isBlank()) return List.of();
        return java.util.Arrays.stream(affectedModules.split(","))
                .map(String::trim)
                .filter(s -> !s.isEmpty())
                .toList();
    }
}
