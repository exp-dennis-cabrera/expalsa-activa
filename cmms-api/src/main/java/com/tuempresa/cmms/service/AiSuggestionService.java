package com.tuempresa.cmms.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.tuempresa.cmms.dto.ai.SuggestClassificationRequest;
import com.tuempresa.cmms.dto.ai.SuggestClassificationResponse;
import com.tuempresa.cmms.model.entity.Category;
import com.tuempresa.cmms.repository.CategoryRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.List;
import java.util.Map;

/**
 * Copiloto de IA, prototipo 1: sugiere categoria y prioridad para una
 * Solicitud a partir de su titulo/descripcion, comparando contra las
 * categorias que ya existen en la organizacion. Corre 100% local via
 * Ollama -- ningun dato sale del servidor propio.
 *
 * Requiere tener Ollama corriendo (ver docker-compose.yml) y el modelo
 * descargado una vez: `ollama pull qwen2.5:7b`.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class AiSuggestionService {

    private final CategoryRepository categoryRepository;

    @Value("${ai.enabled:false}")
    private boolean aiEnabled;

    @Value("${ai.ollama.base-url:http://localhost:11434}")
    private String ollamaBaseUrl;

    @Value("${ai.ollama.model:qwen2.5:7b}")
    private String ollamaModel;

    private final HttpClient httpClient = HttpClient.newBuilder()
            .connectTimeout(Duration.ofSeconds(5))
            .build();
    private final ObjectMapper objectMapper = new ObjectMapper();

    @Transactional(readOnly = true)
    public SuggestClassificationResponse suggestForRequest(SuggestClassificationRequest request) {
        if (!aiEnabled) {
            return new SuggestClassificationResponse(null, null, null,
                    "El copiloto de IA está desactivado (ai.enabled=false).");
        }

        List<Category> categories = categoryRepository.findByType("WORK_ORDER");
        if (categories.isEmpty()) {
            return new SuggestClassificationResponse(null, null, "MEDIUM", "No hay categorías configuradas todavía.");
        }

        String categoryNames = categories.stream().map(Category::getName).reduce((a, b) -> a + ", " + b).orElse("");
        String prompt = buildPrompt(request.title(), request.description(), categoryNames);

        try {
            String rawResponse = callOllama(prompt);
            return parseResponse(rawResponse, categories);
        } catch (Exception e) {
            log.warn("No se pudo obtener sugerencia de IA (¿Ollama está corriendo?): {}", e.getMessage());
            return new SuggestClassificationResponse(null, null, null,
                    "No se pudo contactar al copiloto de IA. ¿Está Ollama corriendo?");
        }
    }

    private String buildPrompt(String title, String description, String categoryNames) {
        return """
                Eres un asistente de un sistema de mantenimiento industrial (CMMS).
                Te doy el título y la descripción de una solicitud de mantenimiento.
                Debes sugerir:
                1. La categoría más apropiada, eligiendo EXACTAMENTE una de esta lista: %s
                2. La prioridad: una de NONE, LOW, MEDIUM, HIGH
                3. Un motivo breve (una frase) de por qué elegiste esa categoría y prioridad

                Título: %s
                Descripción: %s

                Responde SOLO con un JSON válido, sin texto adicional, con este formato exacto:
                {"category": "...", "priority": "...", "reasoning": "..."}
                """.formatted(categoryNames, title, description != null ? description : "(sin descripción)");
    }

    private String callOllama(String prompt) throws Exception {
        Map<String, Object> body = Map.of(
                "model", ollamaModel,
                "prompt", prompt,
                "stream", false,
                "format", "json"
        );
        String requestJson = objectMapper.writeValueAsString(body);
        log.info("Llamando a Ollama en [{}] con body: {}", ollamaBaseUrl + "/api/generate", requestJson);

        HttpRequest httpRequest = HttpRequest.newBuilder()
                .uri(URI.create(ollamaBaseUrl + "/api/generate"))
                .header("Content-Type", "application/json")
                .timeout(Duration.ofSeconds(300)) // la primera carga del modelo en frio, sin GPU, puede tardar varios minutos
                .POST(HttpRequest.BodyPublishers.ofString(requestJson))
                .build();

        HttpResponse<String> response = httpClient.send(httpRequest, HttpResponse.BodyHandlers.ofString());
        log.info("Ollama respondió status={} body={}", response.statusCode(), response.body());
        if (response.statusCode() != 200) {
            throw new RuntimeException("Ollama respondió " + response.statusCode() + ": " + response.body());
        }
        JsonNode envelope = objectMapper.readTree(response.body());
        return envelope.path("response").asText();
    }

    private SuggestClassificationResponse parseResponse(String rawJson, List<Category> categories) {
        try {
            JsonNode parsed = objectMapper.readTree(rawJson);
            String categoryName = parsed.path("category").asText(null);
            String priority = parsed.path("priority").asText("MEDIUM").toUpperCase();
            String reasoning = parsed.path("reasoning").asText(null);

            Category matched = categories.stream()
                    .filter(c -> c.getName().equalsIgnoreCase(categoryName))
                    .findFirst()
                    .orElse(null);

            if (!List.of("NONE", "LOW", "MEDIUM", "HIGH").contains(priority)) {
                priority = "MEDIUM";
            }

            return new SuggestClassificationResponse(
                    matched != null ? matched.getId() : null,
                    matched != null ? matched.getName() : categoryName,
                    priority,
                    reasoning
            );
        } catch (Exception e) {
            log.warn("No se pudo interpretar la respuesta del modelo: {}", rawJson);
            return new SuggestClassificationResponse(null, null, null, "El modelo respondió en un formato inesperado.");
        }
    }
}
