package com.scopesmith.controller;

import com.scopesmith.dto.TaskResponse;
import com.scopesmith.service.TaskBreakdownService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/analyses")
@RequiredArgsConstructor
@CrossOrigin(origins = "http://localhost:5173")
public class AnalysisController {

    private final TaskBreakdownService taskBreakdownService;

    @PostMapping("/{id}/tasks")
    public List<TaskResponse> generateTasks(@PathVariable Long id) {
        return taskBreakdownService.generateTasks(id);
    }
}
