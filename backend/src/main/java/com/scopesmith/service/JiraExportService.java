package com.scopesmith.service;

import com.scopesmith.entity.Task;
import com.scopesmith.repository.AnalysisRepository;
import com.scopesmith.repository.TaskRepository;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.nio.charset.StandardCharsets;
import java.util.List;

@Service
@RequiredArgsConstructor
public class JiraExportService {

    private final TaskRepository taskRepository;
    private final AnalysisRepository analysisRepository;

    private static final String[] CSV_HEADERS = {
            "Summary", "Description", "Issue Type", "Priority", "Story Points", "Category", "Labels", "Depends On"
    };

    @Transactional(readOnly = true)
    public byte[] exportTasksAsCsv(Long analysisId, String projectKey, String issueType) {
        // Verify analysis exists
        analysisRepository.findById(analysisId)
                .orElseThrow(() -> new EntityNotFoundException("Analysis not found with id: " + analysisId));

        List<Task> tasks = taskRepository.findByAnalysisId(analysisId);
        if (tasks.isEmpty()) {
            throw new IllegalStateException("No tasks to export for analysis #" + analysisId);
        }

        StringBuilder csv = new StringBuilder();

        // UTF-8 BOM for Excel compatibility
        csv.append('\uFEFF');

        // Header row
        csv.append(String.join(",", CSV_HEADERS)).append("\n");

        // Data rows
        for (Task task : tasks) {
            csv.append(escapeCsv(task.getTitle())).append(",");
            csv.append(escapeCsv(buildDescription(task))).append(",");
            csv.append(escapeCsv(issueType)).append(",");
            csv.append(escapeCsv(mapPriority(task.getPriority().name()))).append(",");
            csv.append(getStoryPoints(task)).append(",");
            csv.append(escapeCsv(task.getCategory() != null ? task.getCategory() : "")).append(",");
            csv.append(escapeCsv("scopesmith")).append(",");
            csv.append(escapeCsv(task.getDependency() != null ? task.getDependency().getTitle() : ""));
            csv.append("\n");
        }

        return csv.toString().getBytes(StandardCharsets.UTF_8);
    }

    private String buildDescription(Task task) {
        StringBuilder desc = new StringBuilder();

        if (task.getDescription() != null) {
            desc.append(task.getDescription());
        }

        if (task.getAcceptanceCriteria() != null && !task.getAcceptanceCriteria().isBlank()) {
            desc.append("\n\n---\nKabul Kriterleri:\n");
            desc.append(task.getAcceptanceCriteria());
        }

        if (task.getSpRationale() != null && !task.getSpRationale().isBlank()) {
            desc.append("\n\n---\nSP Gerekçesi:\n");
            desc.append(task.getSpRationale());
        }

        if (task.getDependency() != null) {
            desc.append("\n\nBağımlılık: \"").append(task.getDependency().getTitle()).append("\"");
        }

        return desc.toString();
    }

    private String mapPriority(String priority) {
        return switch (priority.toUpperCase(java.util.Locale.ENGLISH)) {
            case "LOW" -> "Low";
            case "MEDIUM" -> "Medium";
            case "HIGH" -> "High";
            case "CRITICAL" -> "Highest";
            default -> "Medium";
        };
    }

    private String getStoryPoints(Task task) {
        Integer sp = task.getSpFinal() != null ? task.getSpFinal() : task.getSpSuggestion();
        return sp != null ? sp.toString() : "";
    }

    /**
     * RFC 4180 CSV escaping: wrap in double quotes if value contains
     * comma, double quote, or newline. Escape double quotes by doubling.
     */
    private String escapeCsv(String value) {
        if (value == null || value.isEmpty()) {
            return "";
        }
        if (value.contains(",") || value.contains("\"") || value.contains("\n") || value.contains("\r")) {
            return "\"" + value.replace("\"", "\"\"") + "\"";
        }
        return value;
    }
}
