package com.tuempresa.cmms.controller;

import com.tuempresa.cmms.dto.response.NotificationResponse;
import com.tuempresa.cmms.dto.response.PageResponse;
import com.tuempresa.cmms.service.NotificationService;
import lombok.RequiredArgsConstructor;
import org.springdoc.core.annotations.ParameterObject;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/notifications")
@RequiredArgsConstructor
public class NotificationController {

    private final NotificationService notificationService;

    @GetMapping
    public PageResponse<NotificationResponse> list(
            @ParameterObject @PageableDefault(size = 20, sort = "createdAt", direction = Sort.Direction.DESC) Pageable pageable) {
        return PageResponse.from(notificationService.list(pageable));
    }

    /** Igual que POST /notifications/search real: paginado por cuerpo de la peticion. */
    @PostMapping("/search")
    public PageResponse<NotificationResponse> search(@RequestBody(required = false) NotificationSearchRequest request) {
        int page = request != null && request.page() != null ? request.page() : 0;
        int size = request != null && request.size() != null ? request.size() : 25;
        Pageable pageable = org.springframework.data.domain.PageRequest.of(
                page, size, Sort.by(Sort.Direction.DESC, "createdAt"));
        return PageResponse.from(notificationService.list(pageable));
    }

    public record NotificationSearchRequest(Integer page, Integer size) {
    }

    @GetMapping("/unread-count")
    public Map<String, Long> unreadCount() {
        return Map.of("count", notificationService.unreadCount());
    }

    /** Igual que GET /notifications/{id} real: solo el dueño puede verla. */
    @GetMapping("/{id}")
    public NotificationResponse getById(@PathVariable Long id) {
        return notificationService.getById(id);
    }

    /**
     * Igual que PATCH /notifications/{id} real: acepta el campo "seen".
     * Se mantiene tambien PATCH /{id}/read por compatibilidad con los
     * clientes ya desplegados.
     */
    @PatchMapping("/{id}")
    public NotificationResponse patch(@PathVariable Long id, @RequestBody(required = false) NotificationPatchRequest request) {
        boolean seen = request == null || request.seen() == null || request.seen();
        if (seen) notificationService.markAsRead(id);
        return notificationService.getById(id);
    }

    public record NotificationPatchRequest(Boolean seen) {
    }

    @PatchMapping("/{id}/read")
    public void markAsRead(@PathVariable Long id) {
        notificationService.markAsRead(id);
    }

    @PatchMapping("/read-all")
    public void markAllAsRead() {
        notificationService.markAllAsRead();
    }

    /**
     * Igual que POST /notifications/push-token real: guarda el token de
     * notificaciones push del dispositivo movil del usuario (uno por
     * usuario -- si ya existe, se reemplaza).
     */
    @PostMapping("/push-token")
    public Map<String, Boolean> savePushToken(@RequestBody PushTokenRequest request) {
        notificationService.savePushToken(request.token());
        return Map.of("success", true);
    }

    public record PushTokenRequest(String token) {
    }
}
