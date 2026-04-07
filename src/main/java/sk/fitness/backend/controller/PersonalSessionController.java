package sk.fitness.backend.controller;

import jakarta.transaction.Transactional;
import sk.fitness.backend.model.PersonalSession;
import sk.fitness.backend.model.User;
import sk.fitness.backend.repository.PersonalSessionRepository;
import sk.fitness.backend.repository.UserRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.HashMap;

@RestController
@RequestMapping("/api/personal-sessions")
public class PersonalSessionController {

    private final PersonalSessionRepository personalSessionRepository;
    private final UserRepository userRepository;

    public PersonalSessionController(PersonalSessionRepository personalSessionRepository,
                                     UserRepository userRepository) {
        this.personalSessionRepository = personalSessionRepository;
        this.userRepository = userRepository;
    }

    // ── TRAINER: Create session ───────────────────────────────────────────────
    @PostMapping
    @Transactional
    public ResponseEntity<?> createSession(
            @RequestBody Map<String, Object> body,
            @AuthenticationPrincipal UserDetails ud) {

        User trainer = resolveUser(ud);
        if (trainer == null || !"trainer".equalsIgnoreCase(trainer.getRole()))
            return ResponseEntity.status(403).body(Map.of("message", "Len tréner môže vytvárať súkromné tréningy"));

        String clientIdStr = (String) body.get("clientId");
        if (clientIdStr == null) return ResponseEntity.badRequest().body(Map.of("message", "Chýba clientId"));
        
        UUID clientId = UUID.fromString(clientIdStr);
        User client = userRepository.findByIdEquals(clientId).orElse(null);
        if (client == null) return ResponseEntity.badRequest().body(Map.of("message", "Klient nenájdený"));

        // Oprava: JSON parser môže poslať číslo ako Long/Double, priamy cast na Integer zlyhá
        Object durationObj = body.getOrDefault("durationMinutes", 60);
        int duration = (durationObj instanceof Number) ? ((Number) durationObj).intValue() : 60;
        
        LocalDateTime start;
        try {
            start = LocalDateTime.parse((String) body.get("startTime"));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("message", "Neplatný formát dátumu a času"));
        }

        LocalDateTime end = start.plusMinutes(duration);

        PersonalSession ps = new PersonalSession(trainer, client, start, end, (String) body.getOrDefault("title", "Súkromný tréning"));
        ps.setNotes((String) body.get("notes"));
        personalSessionRepository.save(ps);

        return ResponseEntity.ok(Map.of("message", "Tréning naplánovaný", "id", ps.getId()));
    }

    // ── TRAINER: Get my sessions ──────────────────────────────────────────────
    @GetMapping("/trainer")
    public ResponseEntity<?> getTrainerSessions(@AuthenticationPrincipal UserDetails ud) {
        User trainer = resolveUser(ud);
        if (trainer == null) return ResponseEntity.status(401).build();
        
        List<Map<String, Object>> sessions = personalSessionRepository
                .findByTrainerIdAndStartTimeAfterOrderByStartTimeAsc(trainer.getId(), LocalDateTime.now())
                .stream().map(this::mapToMap).toList();
        return ResponseEntity.ok(sessions);
    }

    // ── CLIENT: Get my sessions ───────────────────────────────────────────────
    @GetMapping("/my")
    public ResponseEntity<?> getMySessions(@AuthenticationPrincipal UserDetails ud) {
        User client = resolveUser(ud);
        if (client == null) return ResponseEntity.status(401).build();
        
        List<Map<String, Object>> sessions = personalSessionRepository
                .findByClientIdAndStartTimeAfterOrderByStartTimeAsc(client.getId(), LocalDateTime.now())
                .stream().map(this::mapToMap).toList();
        return ResponseEntity.ok(sessions);
    }

    // ── ANY: Mark attendance (only trainer should normally do this) ────────────
    @PatchMapping("/{id}/attendance")
    @Transactional
    public ResponseEntity<?> markAttendance(@PathVariable Long id, @RequestBody Map<String, String> body, @AuthenticationPrincipal UserDetails ud) {
        User user = resolveUser(ud);
        if (user == null) return ResponseEntity.status(401).build();
        
        PersonalSession ps = personalSessionRepository.findById(id).orElse(null);
        if (ps == null) return ResponseEntity.notFound().build();

        // Len tréner tejto session ju môže zmeniť
        if (!ps.getTrainer().getId().equals(user.getId()))
            return ResponseEntity.status(403).build();

        String status = body.get("status");
        if (status != null) {
            ps.setAttendance(sk.fitness.backend.model.AttendanceStatus.valueOf(status));
            personalSessionRepository.save(ps);
        }
        return ResponseEntity.ok(Map.of("message", "Dochádzka upravená"));
    }

    private User resolveUser(UserDetails userDetails) {
        if (userDetails == null) return null;
        return userRepository.findByEmail(userDetails.getUsername()).orElse(null);
    }

    private Map<String, Object> mapToMap(PersonalSession ps) {
        Map<String, Object> m = new HashMap<>();
        m.put("id", ps.getId());
        m.put("startTime", ps.getStartTime());
        m.put("endTime", ps.getEndTime());
        m.put("title", ps.getTitle());
        m.put("notes", ps.getNotes());
        m.put("status", ps.getStatus());
        m.put("attendance", ps.getAttendance());
        m.put("clientId", ps.getClient().getId());
        m.put("clientName", ps.getClient().getFullName());
        m.put("trainerName", ps.getTrainer().getFullName());
        return m;
    }
}
