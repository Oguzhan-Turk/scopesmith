package com.scopesmith.controller;

import com.scopesmith.dto.SpDecisionRequest;
import com.scopesmith.dto.TaskResponse;
import com.scopesmith.entity.Task;
import com.scopesmith.repository.TaskRepository;
import jakarta.persistence.EntityNotFoundException;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/tasks")
@RequiredArgsConstructor
public class TaskController {

    private final TaskRepository taskRepository;

    /**
     * Set the team's final SP decision for a task.
     * This feeds back into the Learning SP system — future estimates
     * will reference this decision for calibration.
     */
    @PutMapping("/{id}/sp-decision")
    public TaskResponse setSpDecision(
            @PathVariable Long id,
            @Valid @RequestBody SpDecisionRequest request) {
        Task task = taskRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Task not found with id: " + id));

        task.setSpFinal(request.getSpFinal());
        return TaskResponse.from(taskRepository.save(task));
    }
}
