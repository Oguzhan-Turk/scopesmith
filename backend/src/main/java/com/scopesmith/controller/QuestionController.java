package com.scopesmith.controller;

import com.scopesmith.dto.AnalysisResponse;
import com.scopesmith.dto.AnswerRequest;
import com.scopesmith.service.QuestionService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/questions")
@RequiredArgsConstructor
public class QuestionController {

    private final QuestionService questionService;

    @PutMapping("/{id}/answer")
    public AnalysisResponse answer(
            @PathVariable Long id,
            @Valid @RequestBody AnswerRequest request) {
        return questionService.answer(id, request.getAnswer());
    }

    @PutMapping("/{id}/dismiss")
    public AnalysisResponse dismiss(@PathVariable Long id) {
        return questionService.dismiss(id);
    }
}
