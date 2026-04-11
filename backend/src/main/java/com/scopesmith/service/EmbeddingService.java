package com.scopesmith.service;

import com.scopesmith.entity.RequirementEmbedding;
import com.scopesmith.repository.AnalysisRepository;
import com.scopesmith.repository.RequirementEmbeddingRepository;
import com.scopesmith.repository.RequirementRepository;
import jakarta.persistence.EntityManager;
import jakarta.persistence.Query;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.ai.embedding.EmbeddingModel;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.lang.Nullable;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;

/**
 * Embedding-based organizational memory.
 *
 * Gracefully degrades when OPENAI_API_KEY is not set:
 *   - isEnabled() returns false
 *   - all embed/find calls are no-ops
 *
 * When key is provided, uses OpenAI text-embedding-3-small (1536 dim)
 * stored in pgvector for cosine similarity search.
 */
@Service
@Slf4j
public class EmbeddingService {

    private static final float SIMILARITY_THRESHOLD = 0.75f;
    private static final int MAX_SIMILAR = 3;

    private final RequirementRepository requirementRepository;
    private final RequirementEmbeddingRepository embeddingRepository;
    private final AnalysisRepository analysisRepository;
    private final EntityManager entityManager;

    @Nullable
    private final EmbeddingModel embeddingModel;

    @Value("${spring.ai.openai.api-key:}")
    private String openAiApiKey;

    public EmbeddingService(
            RequirementRepository requirementRepository,
            RequirementEmbeddingRepository embeddingRepository,
            AnalysisRepository analysisRepository,
            EntityManager entityManager,
            @Nullable EmbeddingModel embeddingModel) {
        this.requirementRepository = requirementRepository;
        this.embeddingRepository = embeddingRepository;
        this.analysisRepository = analysisRepository;
        this.entityManager = entityManager;
        this.embeddingModel = embeddingModel;
    }

    public boolean isEnabled() {
        return embeddingModel != null
                && openAiApiKey != null
                && !openAiApiKey.isBlank()
                && !openAiApiKey.equals("NO_OPENAI_KEY");
    }

    /**
     * Initial embed: rawText only. Called after requirement creation.
     * Async — does not block the main request.
     */
    @Async("embeddingExecutor")
    @Transactional
    public void embedRequirement(Long requirementId) {
        if (!isEnabled()) return;

        requirementRepository.findById(requirementId).ifPresent(req -> {
            try {
                float[] vector = embed(req.getRawText());
                saveOrUpdate(requirementId, vector, false);
                log.info("Embedding saved for requirement #{}", requirementId);
            } catch (Exception e) {
                log.warn("Embedding failed for requirement #{}: {}", requirementId, e.getMessage());
            }
        });
    }

    /**
     * Rich embed: rawText + summary + modules + risk. Called after analysis completion.
     * Overrides the initial embed (is_rich = true).
     */
    @Async("embeddingExecutor")
    @Transactional
    public void embedRequirementRich(Long requirementId, Long analysisId) {
        if (!isEnabled()) return;

        analysisRepository.findById(analysisId).ifPresent(analysis -> {
            try {
                String text = buildRichText(
                        analysis.getRequirement().getRawText(),
                        analysis.getStructuredSummary(),
                        analysis.getAffectedModules(),
                        analysis.getRiskLevel() != null ? analysis.getRiskLevel().name() : null
                );
                float[] vector = embed(text);
                saveOrUpdate(requirementId, vector, true);
                log.info("Rich embedding saved for requirement #{} (analysis #{})", requirementId, analysisId);
            } catch (Exception e) {
                log.warn("Rich embedding failed for requirement #{}: {}", requirementId, e.getMessage());
            }
        });
    }

    /**
     * Find similar requirements in the same project using cosine similarity.
     * Returns empty list when embedding is disabled or no similar results found.
     */
    @Transactional(readOnly = true)
    public List<SimilarRequirement> findSimilar(Long projectId, Long excludeRequirementId, String queryText) {
        if (!isEnabled()) return List.of();

        try {
            float[] queryVector = embed(queryText);
            return querySimilar(projectId, excludeRequirementId, queryVector, MAX_SIMILAR, SIMILARITY_THRESHOLD);
        } catch (Exception e) {
            log.warn("Similarity search failed for project #{}: {}", projectId, e.getMessage());
            return List.of();
        }
    }

    // =========================================================
    // Internal helpers
    // =========================================================

    private float[] embed(String text) {
        var response = embeddingModel.embedForResponse(List.of(text));
        return response.getResults().get(0).getOutput();
    }

    private void saveOrUpdate(Long requirementId, float[] vector, boolean rich) {
        RequirementEmbedding emb = embeddingRepository.findByRequirementId(requirementId)
                .orElseGet(() -> RequirementEmbedding.builder().requirementId(requirementId).build());
        emb.setEmbedding(vector);
        emb.setRich(rich);
        embeddingRepository.save(emb);
    }

    @SuppressWarnings("unchecked")
    private List<SimilarRequirement> querySimilar(Long projectId, Long excludeId,
                                                   float[] queryVector, int limit, float threshold) {
        // pgvector cosine distance: 1 - (a <=> b) = cosine similarity
        String vectorLiteral = toVectorLiteral(queryVector);

        String sql = """
            SELECT r.id, r.raw_text, a_latest.structured_summary, a_latest.risk_level, a_latest.affected_modules,
                   (1 - (re.embedding <=> :qv::vector)) AS similarity
            FROM requirement_embeddings re
            JOIN requirements r ON r.id = re.requirement_id
            LEFT JOIN LATERAL (
                SELECT a.structured_summary, a.risk_level, a.affected_modules
                FROM analyses a
                WHERE a.requirement_id = r.id
                ORDER BY a.created_at DESC
                LIMIT 1
            ) a_latest ON true
            WHERE r.project_id = :projectId
              AND r.id != :excludeId
              AND (1 - (re.embedding <=> :qv::vector)) >= :threshold
            ORDER BY re.embedding <=> :qv::vector
            LIMIT :limit
            """;

        Query query = entityManager.createNativeQuery(sql)
                .setParameter("qv", vectorLiteral)
                .setParameter("projectId", projectId)
                .setParameter("excludeId", excludeId)
                .setParameter("threshold", threshold)
                .setParameter("limit", limit);

        List<Object[]> rows = query.getResultList();
        List<SimilarRequirement> results = new ArrayList<>();
        for (Object[] row : rows) {
            results.add(new SimilarRequirement(
                    ((Number) row[0]).longValue(),
                    (String) row[1],
                    (String) row[2],
                    row[3] != null ? row[3].toString() : null,
                    (String) row[4],
                    ((Number) row[5]).floatValue()
            ));
        }
        return results;
    }

    private String toVectorLiteral(float[] v) {
        StringBuilder sb = new StringBuilder("[");
        for (int i = 0; i < v.length; i++) {
            if (i > 0) sb.append(",");
            sb.append(v[i]);
        }
        sb.append("]");
        return sb.toString();
    }

    private String buildRichText(String rawText, String summary, String modules, String risk) {
        StringBuilder sb = new StringBuilder(rawText != null ? rawText : "");
        if (summary != null && !summary.isBlank()) sb.append("\n\nSummary: ").append(summary);
        if (modules != null && !modules.isBlank()) sb.append("\nModules: ").append(modules);
        if (risk != null && !risk.isBlank()) sb.append("\nRisk: ").append(risk);
        return sb.toString();
    }

    /**
     * Result record for similar requirement queries.
     */
    public record SimilarRequirement(
            Long requirementId,
            String rawText,
            String summary,
            String riskLevel,
            String affectedModules,
            float similarity
    ) {}
}
