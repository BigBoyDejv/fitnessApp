package sk.fitness.backend.controller;

import sk.fitness.backend.model.Notification;
import sk.fitness.backend.model.SentMessage;
import sk.fitness.backend.model.User;
import sk.fitness.backend.repository.NotificationRepository;
import sk.fitness.backend.repository.SentMessageRepository;
import sk.fitness.backend.repository.UserRepository;
import sk.fitness.backend.service.NotificationService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.*;

@RestController
@RequestMapping("/api/notifications")
public class NotificationController {

    private final NotificationRepository notificationRepository;
    private final SentMessageRepository sentMessageRepository;
    private final NotificationService notificationService;
    private final UserRepository userRepository;

    public NotificationController(NotificationRepository notificationRepository,
                                  SentMessageRepository sentMessageRepository,
                                  NotificationService notificationService,
                                  UserRepository userRepository) {
        this.notificationRepository = notificationRepository;
        this.sentMessageRepository = sentMessageRepository;
        this.notificationService = notificationService;
        this.userRepository = userRepository;
    }

    // ── GET /api/notifications ────────────────────────────────────────────────
    @GetMapping
    public ResponseEntity<?> getMyNotifications(@AuthenticationPrincipal UserDetails ud) {
        User user = resolve(ud);
        if (user == null) return ResponseEntity.status(401).build();

        List<Map<String, Object>> result = notificationRepository
                .findByUserIdOrderByCreatedAtDesc(user.getId())
                .stream().map(this::toDto).toList();

        long unread = notificationRepository.countByUserIdAndIsReadFalse(user.getId());

        return ResponseEntity.ok(Map.of("notifications", result, "unreadCount", unread));
    }

    // ── PATCH /api/notifications/{id}/read ───────────────────────────────────
    @PatchMapping("/{id}/read")
    public ResponseEntity<?> markRead(@PathVariable UUID id,
                                      @AuthenticationPrincipal UserDetails ud) {
        User user = resolve(ud);
        if (user == null) return ResponseEntity.status(401).build();

        Notification n = notificationRepository.findById(id).orElse(null);
        if (n == null || !n.getUser().getId().equals(user.getId()))
            return ResponseEntity.notFound().build();

        n.setIsRead(true);
        notificationRepository.save(n);
        return ResponseEntity.ok(Map.of("message", "OK"));
    }

    // ── POST /api/notifications/read-all ─────────────────────────────────────
    @PostMapping("/read-all")
    public ResponseEntity<?> markAllRead(@AuthenticationPrincipal UserDetails ud) {
        User user = resolve(ud);
        if (user == null) return ResponseEntity.status(401).build();
        notificationRepository.markAllReadByUserId(user.getId());
        return ResponseEntity.ok(Map.of("message", "Všetky prečítané"));
    }

    // ── POST /api/notifications/admin-message ────────────────────────────────
    @PostMapping("/admin-message")
    public ResponseEntity<?> sendAdminMessage(@RequestBody Map<String, Object> body,
                                              @AuthenticationPrincipal UserDetails ud) {
        User caller = resolve(ud);
        if (caller == null) return ResponseEntity.status(401).build();
        if (!"admin".equalsIgnoreCase(caller.getRole()) &&
                !"reception".equalsIgnoreCase(caller.getRole()))
            return ResponseEntity.status(403).build();

        String title    = (String) body.getOrDefault("title", "Správa od recepcie");
        String message  = (String) body.get("message");
        String severity = (String) body.getOrDefault("severity", "info");
        String userId   = (String) body.get("userId");

        if (message == null || message.isBlank())
            return ResponseEntity.badRequest().body(Map.of("message", "Správa je prázdna"));

        if (!List.of("info", "warning", "danger").contains(severity)) severity = "info";

        int count = 0;
        UUID targetUUID = null;

        if (userId != null && !userId.isBlank()) {
            User target = userRepository.findByIdEquals(UUID.fromString(userId)).orElse(null);
            if (target == null)
                return ResponseEntity.badRequest().body(Map.of("message", "Používateľ nenájdený"));
            notificationService.send(target, "admin_message", title, message, severity);
            count = 1;
            targetUUID = target.getId();
        } else {
            List<User> members = userRepository.findByRole("member").stream()
                    .filter(u -> Boolean.TRUE.equals(u.getIsActive()))
                    .toList();
            final String finalSeverity = severity;
            members.forEach(u -> notificationService.send(u, "admin_message", title, message, finalSeverity));
            count = members.size();
        }

        // Ulož odoslanú správu raz do sent_messages
        SentMessage sent = new SentMessage();
        sent.setSentBy(caller);
        sent.setTitle(title);
        sent.setMessage(message);
        sent.setSeverity(severity);
        sent.setTargetUserId(targetUUID);
        sent.setRecipientsCount(count);
        sentMessageRepository.save(sent);

        return ResponseEntity.ok(Map.of("message", "Správa odoslaná", "recipients", count));
    }

    // ── GET /api/notifications/sent ──────────────────────────────────────────
    @GetMapping("/sent")
    public ResponseEntity<?> getSentMessages(@AuthenticationPrincipal UserDetails ud) {
        User caller = resolve(ud);
        if (caller == null) return ResponseEntity.status(401).build();
        if (!"admin".equalsIgnoreCase(caller.getRole()) &&
                !"reception".equalsIgnoreCase(caller.getRole()))
            return ResponseEntity.status(403).build();

        List<Map<String, Object>> result = sentMessageRepository
                .findTop20ByOrderByCreatedAtDesc()
                .stream()
                .map(s -> {
                    Map<String, Object> m = new LinkedHashMap<>();
                    m.put("id",             s.getId().toString());
                    m.put("title",          s.getTitle());
                    m.put("message",        s.getMessage());
                    m.put("severity",       s.getSeverity());
                    m.put("recipients",     s.getRecipientsCount());
                    m.put("targetUserId",   s.getTargetUserId() != null ? s.getTargetUserId().toString() : null);
                    m.put("createdAt",      s.getCreatedAt().toString());
                    return m;
                })
                .toList();

        return ResponseEntity.ok(result);
    }

    private User resolve(UserDetails ud) {
        if (ud == null) return null;
        return userRepository.findByEmail(ud.getUsername()).orElse(null);
    }

    private Map<String, Object> toDto(Notification n) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("id",        n.getId().toString());
        m.put("type",      n.getType());
        m.put("title",     n.getTitle());
        m.put("message",   n.getMessage());
        m.put("severity",  n.getSeverity());
        m.put("isRead",    n.getIsRead());
        m.put("createdAt", n.getCreatedAt().toString());
        return m;
    }
}