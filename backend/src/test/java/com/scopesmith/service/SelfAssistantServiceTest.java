package com.scopesmith.service;

import com.scopesmith.config.PromptLoader;
import com.scopesmith.dto.ContextFreshnessResponse;
import com.scopesmith.dto.SelfAssistantAiResult;
import com.scopesmith.dto.SelfAssistantResponse;
import com.scopesmith.entity.ModelTier;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

import java.util.List;
import java.util.Locale;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.ArgumentMatchers.isNull;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class SelfAssistantServiceTest {

    @Mock private AiService aiService;
    @Mock private PromptLoader promptLoader;

    @InjectMocks
    private SelfAssistantService service;

    @BeforeEach
    void setup() {
        ReflectionTestUtils.setField(service, "managedAgentEnabled", false);
        ReflectionTestUtils.setField(service, "aiEnabled", true);
        ReflectionTestUtils.setField(service, "aiMinQuestionLength", 10);
        ReflectionTestUtils.setField(service, "aiMaxQuestionLength", 600);
        lenient().when(promptLoader.load("self-assistant-hybrid")).thenReturn("prompt");
    }

    @Test
    void answer_shouldReturnHybridAnswerWhenAiOutputValid() {
        SelfAssistantAiResult ai = new SelfAssistantAiResult();
        ai.setAnswer("Yönetilen Ajan için en güvenli yaklaşım, önce işi netleştirip sonra insan kontrolü ile ilerlemektir.");
        ai.setConfidence("HIGH");
        SelfAssistantAiResult.ActionItem action = new SelfAssistantAiResult.ActionItem();
        action.setActionType("NAVIGATE");
        action.setLabel("Task'lar");
        action.setTarget("/projects/:id?tab=tasks");
        ai.setActions(List.of(action));

        when(aiService.chatWithStructuredOutput(eq("prompt"), any(String.class), eq(SelfAssistantAiResult.class),
                isNull(), isNull(), eq(ModelTier.LIGHT)))
                .thenReturn(ai);

        SelfAssistantResponse response = service.answer("Managed agent ne zaman kullanılır?", null);

        assertEquals("HIGH", response.getConfidence());
        assertFalse(response.isFallbackUsed());
        assertTrue(response.getAnswer().contains("insan kontrolü"));
        assertEquals(1, response.getActions().size());
    }

    @Test
    void answer_shouldFallbackToDeterministicWhenAiActionUnsafe() {
        SelfAssistantAiResult ai = new SelfAssistantAiResult();
        ai.setAnswer("İş eşitleme için önce kalite kontrol yapıp sonra yönlendirme yapman gerekir.");
        ai.setConfidence("MEDIUM");
        SelfAssistantAiResult.ActionItem action = new SelfAssistantAiResult.ActionItem();
        action.setActionType("NAVIGATE");
        action.setLabel("Dış Link");
        action.setTarget("https://evil.example.com");
        ai.setActions(List.of(action));

        when(aiService.chatWithStructuredOutput(eq("prompt"), any(String.class), eq(SelfAssistantAiResult.class),
                isNull(), isNull(), eq(ModelTier.LIGHT)))
                .thenReturn(ai);

        SelfAssistantResponse response = service.answer("jira sync nasıl olur", null);

        assertEquals("MEDIUM", response.getConfidence());
        assertFalse(response.isFallbackUsed());
        assertEquals(2, response.getActions().size());
        assertTrue(response.getActions().stream().noneMatch(a -> a.getTarget().startsWith("http")));
    }

    @Test
    void answer_shouldUseDeterministicWhenAiDisabled() {
        ReflectionTestUtils.setField(service, "aiEnabled", false);

        ContextFreshnessResponse freshness = ContextFreshnessResponse.builder()
                .status("STALE")
                .recommendation("PARTIAL_REFRESH")
                .build();

        SelfAssistantResponse response = service.answer("context durumu nedir", freshness);

        assertEquals("HIGH", response.getConfidence());
        assertFalse(response.isFallbackUsed());
        assertTrue(response.getAnswer().contains("Kısmi güncelleme öneriliyor"));
    }

    @Test
    void answer_projectDetailsShouldRouteToIntegrationsTab() {
        ReflectionTestUtils.setField(service, "aiEnabled", false);

        SelfAssistantResponse response = service.answer("proje detaylarını incele", null);

        assertEquals("HIGH", response.getConfidence());
        assertFalse(response.isFallbackUsed());
        assertEquals(1, response.getActions().size());
        assertEquals("/projects/:id?tab=integrations", response.getActions().getFirst().getTarget());
    }

    @Test
    void answer_smoke_shouldUsePlainTurkishForEndUserQuestions() {
        ReflectionTestUtils.setField(service, "aiEnabled", false);

        List<String> questions = List.of(
                "Yönetilen ajanı ne zaman kullanmalıyım?",
                "Bağlam güncel değilse ne yapmalıyım?",
                "Jira ile eşitlemeyi nasıl güvenli yaparım?",
                "Proje detaylarını incele",
                "ScopeSmith neden farklı?",
                "Bu sistem ne yapabilir?",
                "Task sync sürecini anlat",
                "Context freshness nedir?",
                "Fallback ne demek?",
                "Yeni kullanıcı nasıl eklenir?"
        );

        for (String question : questions) {
            SelfAssistantResponse response = service.answer(question, null);
            assertTrue(response.getAnswer() != null && !response.getAnswer().isBlank());
            assertNoEnglishJargon(response.getAnswer());
        }
    }

    private void assertNoEnglishJargon(String answer) {
        String lower = answer.toLowerCase(Locale.ENGLISH);
        // Only truly internal terms that must never reach end users.
        // Product names (Jira, GitHub) and UI labels (Task'lar, Bağlam) are intentionally allowed.
        List<String> disallowed = List.of(
                "feature flag", "guardrail", "router", "backlog", "roadmap",
                "managed_agent", "in_progress", "no_baseline", "partial_refresh", "full_refresh"
        );
        assertTrue(disallowed.stream().noneMatch(lower::contains),
                () -> "Yanıtta iç teknik jargon bulundu: " + answer);
    }
}
