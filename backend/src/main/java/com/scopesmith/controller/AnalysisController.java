package com.scopesmith.controller;

import com.scopesmith.dto.AnalysisResponse;
import com.scopesmith.dto.TaskResponse;
import com.scopesmith.entity.Analysis;
import com.scopesmith.entity.Task;
import com.scopesmith.repository.AnalysisRepository;
import com.scopesmith.repository.TaskRepository;
import com.scopesmith.service.StakeholderSummaryService;
import com.scopesmith.service.TaskBreakdownService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/analyses")
@RequiredArgsConstructor
@CrossOrigin(origins = "http://localhost:5173")
public class AnalysisController {

    private final TaskBreakdownService taskBreakdownService;
    private final StakeholderSummaryService stakeholderSummaryService;
    private final AnalysisRepository analysisRepository;
    private final TaskRepository taskRepository;

    @GetMapping("/{id}")
    public AnalysisResponse getAnalysis(@PathVariable Long id) {
        Analysis analysis = analysisRepository.findByIdWithRequirement(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Analysis not found"));
        return AnalysisResponse.from(analysis);
    }

    @GetMapping("/{id}/tasks")
    public List<TaskResponse> getTasks(@PathVariable Long id) {
        List<Task> tasks = taskRepository.findByAnalysisId(id);
        return tasks.stream().map(TaskResponse::from).toList();
    }

    @PostMapping("/{id}/tasks")
    public List<TaskResponse> generateTasks(@PathVariable Long id) {
        return taskBreakdownService.generateTasks(id);
    }

    @PostMapping("/{id}/tasks/refine")
    public List<TaskResponse> refineTasks(
            @PathVariable Long id,
            @RequestBody Map<String, String> request) {
        String instruction = extractInstruction(request);
        return taskBreakdownService.refineTasks(id, instruction);
    }

    @PostMapping("/{id}/stakeholder-summary")
    public Map<String, String> generateStakeholderSummary(@PathVariable Long id) {
        String summary = stakeholderSummaryService.generateSummary(id);
        return Map.of("summary", summary);
    }

    @PostMapping("/{id}/stakeholder-summary/refine")
    public Map<String, String> refineStakeholderSummary(
            @PathVariable Long id,
            @RequestBody Map<String, String> request) {
        String instruction = extractInstruction(request);
        String refined = stakeholderSummaryService.refineSummary(id, instruction);
        return Map.of("summary", refined);
    }

    private String extractInstruction(Map<String, String> request) {
        String instruction = request.get("instruction");
        if (instruction == null || instruction.isBlank()) {
            throw new IllegalArgumentException("instruction cannot be empty");
        }
        if (instruction.length() > 1000) {
            throw new IllegalArgumentException("instruction too long (max 1000 characters)");
        }
        return instruction.trim();
    }
}
