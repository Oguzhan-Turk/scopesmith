package com.scopesmith.controller;

import com.scopesmith.dto.TaskResponse;
import com.scopesmith.service.StakeholderSummaryService;
import com.scopesmith.service.TaskBreakdownService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/analyses")
@RequiredArgsConstructor
@CrossOrigin(origins = "http://localhost:5173")
public class AnalysisController {

    private final TaskBreakdownService taskBreakdownService;
    private final StakeholderSummaryService stakeholderSummaryService;

    @PostMapping("/{id}/tasks")
    public List<TaskResponse> generateTasks(@PathVariable Long id) {
        return taskBreakdownService.generateTasks(id);
    }

    @PostMapping("/{id}/stakeholder-summary")
    public Map<String, String> generateStakeholderSummary(@PathVariable Long id) {
        String summary = stakeholderSummaryService.generateSummary(id);
        return Map.of("summary", summary);
    }
}
