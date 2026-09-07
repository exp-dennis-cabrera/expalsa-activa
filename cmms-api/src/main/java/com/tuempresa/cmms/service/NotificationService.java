package com.tuempresa.cmms.service;

import com.tuempresa.cmms.dto.response.NotificationResponse;
import com.tuempresa.cmms.exception.ResourceNotFoundException;
import com.tuempresa.cmms.model.entity.Notification;
import com.tuempresa.cmms.model.entity.User;
import com.tuempresa.cmms.model.enums.RoleCode;
import com.tuempresa.cmms.repository.NotificationRepository;
import com.tuempresa.cmms.repository.UserRepository;
import com.tuempresa.cmms.security.CurrentUserProvider;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.messaging.simp.SimpMessageSendingOperations;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Set;

/**
 * Notificaciones dentro de la app, con entrega en tiempo real via WebSocket/STOMP --
 * replica exacta del patron de Atlas CMMS: se guarda la notificacion y se envia
 * al destino "/notifications/{userId}" via SimpMessageSendingOperations, de forma
 * asincrona (@Async) para no bloquear la request que la origino.
 * https://docs.atlas-cmms.com/.../work-order-permissions-and-notifications
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class NotificationService {

    private final NotificationRepository notificationRepository;
    private final UserRepository userRepository;
    private final CurrentUserProvider currentUser;
    private final SimpMessageSendingOperations messagingTemplate;
    private final com.tuempresa.cmms.repository.PushNotificationTokenRepository pushTokenRepository;

    @Transactional(readOnly = true)
    public Page<NotificationResponse> list(Pageable pageable) {
        return notificationRepository
                .findByRecipientIdOrderByCreatedAtDesc(currentUser.userId(), pageable)
                .map(this::toResponse);
    }

    @Transactional(readOnly = true)
    public long unreadCount() {
        return notificationRepository.countByRecipientIdAndIsReadFalse(currentUser.userId());
    }

    @Transactional
    public void markAsRead(Long id) {
        Notification notification = notificationRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Notificacion no encontrada: id=" + id));
        // Igual que checkAccessToNotification real: solo el destinatario puede
        // tocarla. Sin esto, cualquier usuario de la organizacion podia marcar
        // como leida la notificacion de otro conociendo su id.
        if (!notification.getRecipient().getId().equals(currentUser.userId())) {
            throw new com.tuempresa.cmms.exception.ForbiddenOperationException(
                    "Esta notificación no te pertenece.");
        }
        notification.setIsRead(true);
        notificationRepository.save(notification);
    }

    /** Igual que checkAccessToNotification real: solo el destinatario puede verla. */
    @Transactional(readOnly = true)
    public NotificationResponse getById(Long id) {
        Notification notification = notificationRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Notificacion no encontrada: id=" + id));
        if (!notification.getRecipient().getId().equals(currentUser.userId())) {
            throw new com.tuempresa.cmms.exception.ForbiddenOperationException("Esta notificación no es tuya.");
        }
        return toResponse(notification);
    }

    /** Igual que POST /notifications/push-token real: uno por usuario, se reemplaza si ya existe. */
    @Transactional
    public void savePushToken(String token) {
        User user = userRepository.findById(currentUser.userId())
                .orElseThrow(() -> new ResourceNotFoundException("Usuario no encontrado"));
        com.tuempresa.cmms.model.entity.PushNotificationToken entity = pushTokenRepository
                .findByUserId(user.getId())
                .orElseGet(() -> {
                    var t = new com.tuempresa.cmms.model.entity.PushNotificationToken();
                    t.setOrganizationId(user.getOrganizationId());
                    t.setUser(user);
                    return t;
                });
        entity.setToken(token);
        pushTokenRepository.save(entity);
    }

    @Transactional
    public void markAllAsRead() {
        var page = notificationRepository.findByRecipientIdOrderByCreatedAtDesc(
                currentUser.userId(), Pageable.unpaged());
        page.forEach(n -> n.setIsRead(true));
        notificationRepository.saveAll(page.getContent());
    }

    // ---- creacion interna, llamada desde otros servicios (ej. WorkOrderService) ----

    @Transactional
    public void notifyUser(User recipient, String type, String title, String message, Long resourceId) {
        Notification notification = new Notification();
        notification.setOrganizationId(recipient.getOrganizationId());
        notification.setRecipient(recipient);
        notification.setNotificationType(toNotificationType(type));
        notification.setTitle(title);
        notification.setMessage(message);
        notification.setResourceId(resourceId);
        Notification saved = notificationRepository.save(notification);

        // Push en tiempo real por WebSocket, igual que Atlas: destino "/notifications/{userId}".
        // Corre en un hilo separado (@Async) para no bloquear la transaccion que la origino.
        broadcast(recipient.getEmail(), toResponse(saved));

        // Push al celular (Expo). Tambien asincrono: si el envio falla o
        // tarda, no debe afectar la operacion que genero la notificacion.
        //
        // Se pasan los mismos datos que el real: el tipo de recurso y su id,
        // que es lo que la app movil lee para saber a que pantalla navegar.
        sendPushNotifications(
                java.util.List.of(recipient),
                saved.getTitle(),
                saved.getMessage(),
                java.util.Map.of(
                        "type", saved.getNotificationType(),
                        "id", saved.getResourceId() != null ? saved.getResourceId() : 0L));
    }

    /**
     * Copia fiel de sendPushNotifications real: recibe VARIOS usuarios y
     * hace UN solo envio a Expo con todos sus tokens, en vez de una
     * peticion por destinatario.
     */
    @Async
    public void sendPushNotifications(java.util.Collection<User> users, String title, String message,
                                      java.util.Map<String, Object> data) {
        try {
            java.util.List<String> tokens = new java.util.ArrayList<>();
            users.forEach(user -> {
                var optionalToken = pushTokenRepository.findByUserId(user.getId());
                if (optionalToken.isPresent()) {
                    String token = optionalToken.get().getToken();
                    if (io.github.jav.exposerversdk.PushClient.isExponentPushToken(token)) {
                        tokens.add(token);
                    }
                }
            });
            if (tokens.isEmpty()) return;

            io.github.jav.exposerversdk.ExpoPushMessage expoPushMessage =
                    new io.github.jav.exposerversdk.ExpoPushMessage();
            expoPushMessage.getTo().addAll(tokens);
            expoPushMessage.setTitle(title);
            expoPushMessage.setBody(message);
            expoPushMessage.setData(data);

            var expoPushMessages = new java.util.ArrayList<io.github.jav.exposerversdk.ExpoPushMessage>();
            expoPushMessages.add(expoPushMessage);

            io.github.jav.exposerversdk.PushClient client = new io.github.jav.exposerversdk.PushClient();

            var futuros = new java.util.ArrayList<
                    java.util.concurrent.CompletableFuture<
                            java.util.List<io.github.jav.exposerversdk.ExpoPushTicket>>>();
            for (var chunk : client.chunkPushNotifications(expoPushMessages)) {
                futuros.add(client.sendPushNotificationsAsync(chunk));
            }

            var todosLosTickets = new java.util.ArrayList<io.github.jav.exposerversdk.ExpoPushTicket>();
            for (var futuro : futuros) {
                todosLosTickets.addAll(futuro.get());
            }

            var pares = client.zipMessagesTickets(expoPushMessages, todosLosTickets);
            var conError = client.filterAllMessagesWithError(pares);
            if (conError.isEmpty()) {
                log.info("Notificación push enviada a {} dispositivo(s)", tokens.size());
            } else {
                conError.forEach(p -> log.warn("Expo rechazó la notificación: {}",
                        p.ticket.getDetails() != null ? p.ticket.getDetails().getError() : "sin detalle"));
            }
        } catch (Exception e) {
            // El SDK de Expo solo reconoce el error "DeviceNotRegistered": ante
            // cualquier otro (InvalidCredentials, MismatchSenderId...) falla al
            // deserializar y se pierde el motivo real. Se rescata del mensaje
            // de la excepcion para que quede registrado.
            String detalle = e.getMessage() != null ? e.getMessage() : "";
            if (detalle.contains("InvalidCredentials")) {
                log.error("Push rechazado: credenciales de Firebase (FCM) invalidas. "
                        + "Revisa la clave de cuenta de servicio en EAS y que la API de FCM este habilitada.");
            } else if (detalle.contains("MismatchSenderId")) {
                log.error("Push rechazado: el proyecto de Firebase del APK no coincide con el de las credenciales.");
            } else {
                log.warn("No se pudo enviar la notificación push: {}", e.getMessage(), e);
            }
        }
    }

    /**
     * Traduce nuestros tipos granulares ("que paso") al tipo de MODULO que
     * usa el real ("a donde navegar al hacer clic"). El detalle de que paso
     * se sigue viendo en el titulo de la notificacion, asi que no se pierde
     * informacion -- pero ahora cada notificacion sabe a que pantalla ir.
     */
    private com.tuempresa.cmms.model.enums.NotificationType toNotificationType(String type) {
        if (type == null) return com.tuempresa.cmms.model.enums.NotificationType.INFO;
        return switch (type) {
            case "WORK_ORDER_ASSIGNED", "WORK_ORDER_COMMENT", "WORK_ORDER_STATUS_CHANGED",
                 "WORK_ORDER_CREATED", "WORK_ORDER" ->
                    com.tuempresa.cmms.model.enums.NotificationType.WORK_ORDER;
            case "NEW_REQUEST", "REQUEST_APPROVED", "REQUEST_CANCELLED", "REQUEST" ->
                    com.tuempresa.cmms.model.enums.NotificationType.REQUEST;
            case "MATERIAL_REQUEST", "PART" -> com.tuempresa.cmms.model.enums.NotificationType.PART;
            case "ASSET" -> com.tuempresa.cmms.model.enums.NotificationType.ASSET;
            case "METER_READING_OVERDUE" -> com.tuempresa.cmms.model.enums.NotificationType.METER_READING_OVERDUE;
            case "METER" -> com.tuempresa.cmms.model.enums.NotificationType.METER;
            case "LOCATION" -> com.tuempresa.cmms.model.enums.NotificationType.LOCATION;
            case "TEAM" -> com.tuempresa.cmms.model.enums.NotificationType.TEAM;
            case "PURCHASE_ORDER" -> com.tuempresa.cmms.model.enums.NotificationType.PURCHASE_ORDER;
            default -> com.tuempresa.cmms.model.enums.NotificationType.INFO;
        };
    }

    @Transactional
    public void notifyAdmins(String type, String title, String message, Long resourceId) {
        List<User> admins = userRepository.findByRoleNameIn(Set.of(RoleCode.ADMIN, RoleCode.LIMITED_ADMIN));
        admins.forEach(admin -> notifyUser(admin, type, title, message, resourceId));
    }

    /**
     * Copia fiel del envio real: convertAndSendToUser con el EMAIL del
     * destinatario. Spring lo enruta a "/user/{email}/notifications", que
     * solo esa sesion recibe.
     *
     * Antes se publicaba en "/notifications/{id}", un canal abierto que
     * cualquiera podia escuchar conociendo el id del usuario.
     */
    @Async
    public void broadcast(String recipientEmail, NotificationResponse payload) {
        messagingTemplate.convertAndSendToUser(recipientEmail, "/notifications", payload);
    }

    private NotificationResponse toResponse(Notification n) {
        return new NotificationResponse(
                n.getId(), n.getNotificationType(), n.getTitle(), n.getMessage(), n.getResourceId(),
                Boolean.TRUE.equals(n.getIsRead()), n.getCreatedAt());
    }
}
