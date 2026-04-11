package com.scopesmith.service;

import com.scopesmith.config.PromptLoader;
import com.scopesmith.dto.ContextFreshnessResponse;
import com.scopesmith.dto.SelfAssistantAiResult;
import com.scopesmith.dto.SelfAssistantResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Set;

@Service
@RequiredArgsConstructor
@Slf4j
public class SelfAssistantService {

    private static final Set<String> ALLOWED_TABS = Set.of(
            "requirements", "tasks", "context", "integrations", "usage"
    );

    private static final Set<String> ALLOWED_ACTION_TARGETS = Set.of(
            "/projects/:id",
            "/projects/:id?tab=requirements",
            "/projects/:id?tab=tasks",
            "/projects/:id?tab=context",
            "/projects/:id?tab=integrations",
            "/projects/:id?tab=usage"
    );

    private static final Set<String> ALLOWED_CONFIDENCE = Set.of("HIGH", "MEDIUM", "LOW");
    private static final Set<String> DISALLOWED_JARGON = Set.of(
            "dispatch", "review", "context", "sync", "fallback", "router",
            "workflow", "prompt", "guardrail", "policy", "feature flag",
            "stale", "freshness", "roadmap", "backlog"
    );

    private final AiService aiService;
    private final PromptLoader promptLoader;

    @Value("${scopesmith.features.managed-agent-enabled:false}")
    private boolean managedAgentEnabled;

    @Value("${scopesmith.assistant.ai-enabled:true}")
    private boolean aiEnabled;

    @Value("${scopesmith.assistant.ai-min-question-length:10}")
    private int aiMinQuestionLength;

    @Value("${scopesmith.assistant.ai-max-question-length:600}")
    private int aiMaxQuestionLength;

    public SelfAssistantResponse answer(String question, ContextFreshnessResponse contextFreshness) {
        String safeQuestion = question == null ? "" : question.trim();
        String q = normalize(safeQuestion);
        Intent intent = detectIntent(q);

        SelfAssistantResponse deterministic = deterministicAnswer(intent, contextFreshness);
        if (!shouldUseAi(safeQuestion)) {
            return deterministic;
        }

        try {
            SelfAssistantResponse hybrid = hybridAnswer(safeQuestion, intent, deterministic, contextFreshness);
            if (hybrid != null) {
                return hybrid;
            }
        } catch (Exception e) {
            log.warn("Self-assistant AI branch failed, returning deterministic response: {}", e.getMessage());
        }

        return deterministic;
    }

    private SelfAssistantResponse hybridAnswer(
            String question,
            Intent intent,
            SelfAssistantResponse deterministic,
            ContextFreshnessResponse freshness
    ) {
        String systemPrompt = promptLoader.load("self-assistant-hybrid");
        String userMessage = buildAiMessage(question, intent, deterministic, freshness);

        SelfAssistantAiResult aiResult = aiService.chatWithStructuredOutput(
                systemPrompt,
                userMessage,
                SelfAssistantAiResult.class
        );

        if (aiResult == null) {
            return null;
        }
        String safeAnswer = sanitizeAnswerLanguage(aiResult.getAnswer());
        if (!isValidAiAnswer(safeAnswer)) return null;

        String confidence = normalizeConfidence(aiResult.getConfidence(), deterministic.getConfidence());
        List<SelfAssistantResponse.ActionItem> actions = sanitizeActions(aiResult.getActions());
        if (actions.isEmpty()) {
            actions = deterministic.getActions();
        }

        return SelfAssistantResponse.builder()
                .answer(safeAnswer)
                .confidence(confidence)
                .fallbackUsed(false)
                .evidence(List.of())
                .actions(actions)
                .build();
    }

    private String buildAiMessage(
            String question,
            Intent intent,
            SelfAssistantResponse deterministic,
        ContextFreshnessResponse freshness
    ) {
        StringBuilder sb = new StringBuilder();
        sb.append("Kullanıcı sorusu:\n").append(question).append("\n\n");
        sb.append("Algılanan niyet:\n").append(intent.name()).append("\n\n");
        sb.append("Temel yanıt:\n").append(deterministic.getAnswer()).append("\n\n");
        sb.append("İzinli yönlendirme hedefleri:\n");
        for (String target : ALLOWED_ACTION_TARGETS) {
            sb.append("- ").append(target).append("\n");
        }
        sb.append("\n");
        sb.append("Bağlam güncelliği özeti:\n");
        if (freshness == null) {
            sb.append("- proje verisi yok\n");
        } else {
            sb.append("- durum: ").append(nullSafe(freshness.getStatus())).append("\n");
            sb.append("- öneri: ").append(nullSafe(freshness.getRecommendation())).append("\n");
            sb.append("- güven puanı: ").append(intSafe(freshness.getContextConfidence())).append("\n");
        }
        sb.append("\nYanıt tamamen sade Türkçe olmalı. İngilizce teknik terim kullanma.");
        return sb.toString();
    }

    private boolean shouldUseAi(String question) {
        if (!aiEnabled) return false;
        int len = question == null ? 0 : question.trim().length();
        return len >= aiMinQuestionLength && len <= aiMaxQuestionLength;
    }

    private Intent detectIntent(String q) {
        if (containsAny(q, "managed agent", "agent", "claude code")) return Intent.MANAGED_AGENT;
        if (containsAny(q, "proje detay", "project detail", "proje ayar", "project setting", "ayarlar")) return Intent.PROJECT_SETTINGS;
        if (containsAny(q, "jira", "github", "sync", "senkron")) return Intent.SYNC;
        if (containsAny(q, "context", "baglam", "bağlam", "stale", "freshness", "tarama", "scan", "güncel", "guncel")) return Intent.CONTEXT;
        if (containsAny(q, "neden scopesmith", "niye scopesmith", "farki ne", "farkı ne", "why scopesmith")) return Intent.DIFFERENTIATION;
        if (containsAny(q, "ne yapar", "ne yapabilir", "ozellik", "özellik", "capability", "yetenek")) return Intent.CAPABILITY;
        return Intent.UNKNOWN;
    }

    private SelfAssistantResponse deterministicAnswer(Intent intent, ContextFreshnessResponse freshness) {
        return switch (intent) {
            case MANAGED_AGENT -> managedAgentAnswer();
            case PROJECT_SETTINGS -> projectSettingsAnswer();
            case SYNC -> syncAnswer();
            case CONTEXT -> contextAnswer(freshness);
            case DIFFERENTIATION -> differentiationAnswer();
            case CAPABILITY -> capabilityAnswer();
            case UNKNOWN -> fallbackAnswer();
        };
    }

    private SelfAssistantResponse managedAgentAnswer() {
        String status = managedAgentEnabled ? "açık" : "kapalı";
        return SelfAssistantResponse.builder()
                .answer("Yönetilen Ajan şu anda " + status + ". En güvenli kullanım için önce ScopeSmith'te işi netleştir, sonra Jira veya GitHub'a gönder ve son adımda insan kontrolü yap.")
                .confidence("HIGH")
                .fallbackUsed(false)
                .evidence(List.of())
                .actions(List.of(action("İş Listesine Git", "NAVIGATE", "/projects/:id?tab=tasks")))
                .build();
    }

    private SelfAssistantResponse syncAnswer() {
        return SelfAssistantResponse.builder()
                .answer("İşleri eşitlemek için en güvenli yol şudur: önce ScopeSmith'te işi netleştir, ardından Jira veya GitHub'a gönder. Böylece takip kaydı düzenli kalır.")
                .confidence("HIGH")
                .fallbackUsed(false)
                .evidence(List.of())
                .actions(List.of(
                        action("Proje Ayarları", "NAVIGATE", "/projects/:id?tab=integrations"),
                        action("İş Listesi", "NAVIGATE", "/projects/:id?tab=tasks")
                ))
                .build();
    }

    private SelfAssistantResponse projectSettingsAnswer() {
        return SelfAssistantResponse.builder()
                .answer("Proje bilgileri ve entegrasyon ayarları için Proje Ayarları sekmesine geçebilirsin.")
                .confidence("HIGH")
                .fallbackUsed(false)
                .evidence(List.of())
                .actions(List.of(action("Proje Ayarları", "NAVIGATE", "/projects/:id?tab=integrations")))
                .build();
    }

    private SelfAssistantResponse contextAnswer(ContextFreshnessResponse freshness) {
        if (freshness == null) {
            return SelfAssistantResponse.builder()
                    .answer("Bağlamın güncel olup olmadığını proje bazında ölçüyoruz. Projeyi seçtikten sonra Bağlam sekmesinde durum ve önerilen adımları görebilirsin.")
                    .confidence("MEDIUM")
                    .fallbackUsed(true)
                    .evidence(List.of())
                    .actions(List.of(action("Bağlam Sekmesi", "NAVIGATE", "/projects/:id?tab=context")))
                    .build();
        }

        String summary = String.format("Bağlam durumu: %s. Öneri: %s.",
                toTurkishStatus(freshness.getStatus()),
                toTurkishRecommendation(freshness.getRecommendation()));

        return SelfAssistantResponse.builder()
                .answer(summary + " Önemli kararlar öncesinde önerilen güncelleme adımını çalıştırman sonuç kalitesini artırır.")
                .confidence("HIGH")
                .fallbackUsed(false)
                .evidence(List.of())
                .actions(List.of(action("Bağlam Sekmesi", "NAVIGATE", "/projects/:id?tab=context")))
                .build();
    }

    private SelfAssistantResponse differentiationAnswer() {
        return SelfAssistantResponse.builder()
                .answer("ScopeSmith'in farkı, işin sadece yazılım üretimi değil, süreç güvenilirliğini de yönetmesidir. Bağlam güncelliği, iş kalitesi ve takip düzeni birlikte korunur.")
                .confidence("HIGH")
                .fallbackUsed(false)
                .evidence(List.of())
                .actions(List.of(
                        action("İş Listesi", "NAVIGATE", "/projects/:id?tab=tasks"),
                        action("Bağlam Sekmesi", "NAVIGATE", "/projects/:id?tab=context")
                ))
                .build();
    }

    private SelfAssistantResponse capabilityAnswer() {
        return SelfAssistantResponse.builder()
                .answer("ScopeSmith; talebi analiz eder, yapılacak işleri çıkarır, efor önerir, bağlamı güncel tutar ve Jira/GitHub ile düzenli takip sağlar.")
                .confidence("HIGH")
                .fallbackUsed(false)
                .evidence(List.of())
                .actions(List.of(
                        action("İş Listesi", "NAVIGATE", "/projects/:id?tab=tasks"),
                        action("Proje Ayarları", "NAVIGATE", "/projects/:id?tab=integrations")
                ))
                .build();
    }

    private SelfAssistantResponse fallbackAnswer() {
        return SelfAssistantResponse.builder()
                .answer("Daha iyi yardımcı olabilmem için sorunu biraz daha net yazar mısın? Örnek: \"İşleri Jira'ya nasıl gönderirim?\" veya \"Bağlam neden güncelliğini kaybeder?\"")
                .confidence("LOW")
                .fallbackUsed(true)
                .evidence(List.of())
                .actions(List.of(
                        action("İş Listesi", "NAVIGATE", "/projects/:id?tab=tasks"),
                        action("Bağlam Sekmesi", "NAVIGATE", "/projects/:id?tab=context")
                ))
                .build();
    }

    private boolean isValidAiAnswer(String answer) {
        if (answer == null) return false;
        String trimmed = answer.trim();
        if (trimmed.length() < 20 || trimmed.length() > 800) return false;
        String lower = trimmed.toLowerCase(Locale.ENGLISH);
        if (lower.contains("docs/") || lower.contains(".md") || lower.contains("file://")
                || lower.contains("vscode://") || lower.contains("http://") || lower.contains("https://")) {
            return false;
        }
        for (String jargon : DISALLOWED_JARGON) {
            if (lower.contains(jargon)) {
                return false;
            }
        }
        return true;
    }

    private String sanitizeAnswerLanguage(String answer) {
        if (answer == null) return "";
        String fixed = answer.trim();
        fixed = fixed.replaceAll("(?i)\\bmanaged agent\\b", "Yönetilen Ajan");
        fixed = fixed.replaceAll("(?i)\\btask\\b", "iş");
        fixed = fixed.replaceAll("(?i)\\bcontext\\b", "bağlam");
        fixed = fixed.replaceAll("(?i)\\bsync\\b", "eşitleme");
        fixed = fixed.replaceAll("(?i)\\bdispatch\\b", "gönderim");
        fixed = fixed.replaceAll("(?i)\\breview\\b", "kontrol");
        fixed = fixed.replaceAll("(?i)\\bfallback\\b", "yedek yanıt");
        return fixed.replaceAll("\\s+", " ").trim();
    }

    private String normalizeConfidence(String aiConfidence, String fallbackConfidence) {
        String normalized = normalize(aiConfidence).toUpperCase(Locale.ENGLISH);
        if (ALLOWED_CONFIDENCE.contains(normalized)) return normalized;
        return fallbackConfidence;
    }

    private List<SelfAssistantResponse.ActionItem> sanitizeActions(List<SelfAssistantAiResult.ActionItem> rawActions) {
        if (rawActions == null || rawActions.isEmpty()) return List.of();

        List<SelfAssistantResponse.ActionItem> sanitized = new ArrayList<>();
        Set<String> uniqueTargets = new LinkedHashSet<>();
        for (SelfAssistantAiResult.ActionItem a : rawActions) {
            if (a == null) continue;
            String actionType = normalize(a.getActionType()).toUpperCase(Locale.ENGLISH);
            String target = a.getTarget() == null ? "" : a.getTarget().trim();
            String label = a.getLabel() == null ? "" : a.getLabel().trim();

            if (!"NAVIGATE".equals(actionType)) continue;
            if (!isAllowedTarget(target)) continue;
            if (label.isBlank()) label = "İlgili Sayfaya Git";
            if (label.equalsIgnoreCase("Task'lar") || label.equalsIgnoreCase("Tasks")) label = "İş Listesi";
            if (label.equalsIgnoreCase("Task'lara Git")) label = "İş Listesine Git";
            if (label.length() > 40) label = label.substring(0, 40);
            if (!uniqueTargets.add(target)) continue;

            sanitized.add(action(label, "NAVIGATE", target));
            if (sanitized.size() >= 2) break;
        }
        return sanitized;
    }

    private boolean isAllowedTarget(String target) {
        if (!ALLOWED_ACTION_TARGETS.contains(target)) return false;
        if (!target.startsWith("/projects/:id")) return false;
        int tabIdx = target.indexOf("?tab=");
        if (tabIdx < 0) return true;
        String tab = target.substring(tabIdx + 5).trim();
        return ALLOWED_TABS.contains(tab);
    }

    private SelfAssistantResponse.ActionItem action(String label, String actionType, String target) {
        return SelfAssistantResponse.ActionItem.builder()
                .label(label)
                .actionType(actionType)
                .target(target)
                .build();
    }

    private boolean containsAny(String haystack, String... needles) {
        for (String needle : needles) {
            if (haystack.contains(normalize(needle))) return true;
        }
        return false;
    }

    private String normalize(String text) {
        if (text == null) return "";
        return text.toLowerCase(Locale.ENGLISH).trim();
    }

    private String nullSafe(String value) {
        return value == null || value.isBlank() ? "UNKNOWN" : value;
    }

    private String toTurkishStatus(String status) {
        if (status == null) return "Bilinmiyor";
        return switch (status.toUpperCase(Locale.ENGLISH)) {
            case "FRESH" -> "Güncel";
            case "STALE" -> "Güncel Değil";
            case "NO_BASELINE" -> "Henüz Ölçülmedi";
            default -> "Bilinmiyor";
        };
    }

    private String toTurkishRecommendation(String recommendation) {
        if (recommendation == null) return "Bilinmiyor";
        return switch (recommendation.toUpperCase(Locale.ENGLISH)) {
            case "NO_ACTION" -> "Ek işlem gerekmiyor";
            case "PARTIAL_REFRESH" -> "Kısmi güncelleme öneriliyor";
            case "FULL_REFRESH" -> "Tam güncelleme öneriliyor";
            default -> "Bilinmiyor";
        };
    }

    private int intSafe(Integer value) {
        return value == null ? -1 : value;
    }

    private enum Intent {
        MANAGED_AGENT,
        PROJECT_SETTINGS,
        SYNC,
        CONTEXT,
        DIFFERENTIATION,
        CAPABILITY,
        UNKNOWN
    }
}
