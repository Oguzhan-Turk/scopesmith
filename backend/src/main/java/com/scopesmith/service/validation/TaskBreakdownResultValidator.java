package com.scopesmith.service.validation;

import com.scopesmith.dto.TaskBreakdownResult;
import com.scopesmith.util.FibonacciUtil;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.util.HashSet;
import java.util.Set;

@Component
@Slf4j
public class TaskBreakdownResultValidator {

    public TaskBreakdownResult validate(TaskBreakdownResult result, ValidationContext context) {
        if (result == null || result.getTasks() == null) return result;

        // Collect known task titles for dependsOn validation
        Set<String> taskTitles = new HashSet<>();
        result.getTasks().forEach(t -> { if (t.getTitle() != null) taskTitles.add(t.getTitle()); });

        for (TaskBreakdownResult.TaskItem task : result.getTasks()) {
            // SP fibonacci auto-correct
            if (task.getSpSuggestion() != null) {
                int original = task.getSpSuggestion();
                if (!FibonacciUtil.isFibonacci(original)) {
                    int corrected = FibonacciUtil.nearestFibonacci(original);
                    log.info("Auto-corrected SP from {} to {} for task '{}'", original, corrected, task.getTitle());
                    task.setSpSuggestion(corrected);
                }
            }

            // Verify dependsOn references
            if (task.getDependsOn() != null && !task.getDependsOn().isBlank()) {
                if (!taskTitles.contains(task.getDependsOn())) {
                    log.warn("Task '{}' depends on unknown task '{}', clearing reference", task.getTitle(), task.getDependsOn());
                    task.setDependsOn(null);
                }
            }
        }

        return result;
    }
}
