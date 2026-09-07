package com.tuempresa.cmms.controller;

import com.tuempresa.cmms.dto.ai.SuggestClassificationRequest;
import com.tuempresa.cmms.dto.ai.SuggestClassificationResponse;
import com.tuempresa.cmms.service.AiSuggestionService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/ai")
@RequiredArgsConstructor
public class AiController {

    private final AiSuggestionService aiSuggestionService;

    @PostMapping("/suggest-request-classification")
    public SuggestClassificationResponse suggestRequestClassification(@Valid @RequestBody SuggestClassificationRequest request) {
        return aiSuggestionService.suggestForRequest(request);
    }
}
