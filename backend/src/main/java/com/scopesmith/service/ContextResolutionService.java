package com.scopesmith.service;

import com.scopesmith.entity.Project;
import com.scopesmith.entity.ProjectServiceNode;
import com.scopesmith.repository.ProjectServiceNodeRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.List;

/**
 * Single point of truth for resolving which context to inject into AI prompts.
 *
 * <p>Design rationale (ADR-008):
 * <ul>
 *   <li><b>Single-repo project</b> (no active scanned workspace services): returns project-level
 *       context only — identical to the original behaviour.</li>
 *   <li><b>Multi-service project</b> (≥1 active, already-scanned workspace service): returns the
 *       project-level context PLUS each service's context so the AI understands the full
 *       distributed system.</li>
 * </ul>
 *
 * <p>All AI services call {@link PromptContextBuilder} which delegates here, so the
 * single/multi-service switch is transparent to callers.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class ContextResolutionService {

    private final ProjectServiceNodeRepository projectServiceNodeRepository;

    /**
     * Resolve the effective context for {@code project}.
     *
     * <p>Only services that are both <em>active</em> and already <em>scanned</em>
     * (have at least a {@code techContext}) contribute to the federated context.
     * Services that exist in the registry but have not yet been scanned are ignored.
     */
    public ResolvedContext resolve(Project project) {
        List<ProjectServiceNode> allServices =
                projectServiceNodeRepository.findByProjectIdOrderByNameAsc(project.getId());

        List<ResolvedContext.ServiceContext> serviceContexts = allServices.stream()
                .filter(s -> Boolean.TRUE.equals(s.getActive()))
                .filter(s -> s.getTechContext() != null && !s.getTechContext().isBlank())
                .map(s -> new ResolvedContext.ServiceContext(
                        s.getName(),
                        s.getTechContext(),
                        s.getStructuredContext()))
                .toList();

        if (!serviceContexts.isEmpty()) {
            log.debug("Project #{} — federated context: {} scanned workspace service(s)",
                    project.getId(), serviceContexts.size());
        }

        return new ResolvedContext(
                project.getTechContext(),
                project.getStructuredContext(),
                project.getClaudeMdContent(),
                serviceContexts);
    }

    // ─── Value record ────────────────────────────────────────────────────────

    /**
     * Resolved context snapshot passed to {@link PromptContextBuilder}.
     *
     * @param techContext       free-text project context (nullable)
     * @param structuredContext structured context JSONB (nullable)
     * @param claudeMdContent   CLAUDE.md developer notes (nullable)
     * @param serviceContexts   per-service contexts (empty for single-repo projects)
     */
    public record ResolvedContext(
            String techContext,
            String structuredContext,
            String claudeMdContent,
            List<ServiceContext> serviceContexts) {

        /** Returns {@code true} if federated (multi-service) context is available. */
        public boolean hasServiceContexts() {
            return serviceContexts != null && !serviceContexts.isEmpty();
        }

        /**
         * Context for a single workspace service.
         *
         * @param name              service name (for display in prompt sections)
         * @param techContext       free-text service context
         * @param structuredContext structured context JSONB (nullable)
         */
        public record ServiceContext(
                String name,
                String techContext,
                String structuredContext) {}
    }
}
