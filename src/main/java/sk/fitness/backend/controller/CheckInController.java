package sk.fitness.backend.controller;

import sk.fitness.backend.model.CheckIn;
import sk.fitness.backend.model.User;
import sk.fitness.backend.repository.CheckInRepository;
import sk.fitness.backend.repository.UserRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/checkin")
public class CheckInController {

    private final CheckInRepository checkInRepository;
    private final UserRepository userRepository;

    public CheckInController(CheckInRepository checkInRepository, UserRepository userRepository) {
        this.checkInRepository = checkInRepository;
        this.userRepository = userRepository;
    }

    // ── GET /api/checkin/history/{userId} ─────────────────────────────────────
    @GetMapping("/history/{userId}")
    public ResponseEntity<?> getHistory(
            @PathVariable String userId,
            @AuthenticationPrincipal UserDetails userDetails) {

        if (userDetails == null) return ResponseEntity.status(401).build();

        User caller = userRepository.findByEmail(userDetails.getUsername()).orElse(null);
        if (caller == null) return ResponseEntity.status(401).build();

        UUID uid = UUID.fromString(userId);

        if (!caller.getId().equals(uid) && !caller.getRole().equalsIgnoreCase("admin")) {
            return ResponseEntity.status(403).body("Nemáš oprávnenie");
        }

        // HashMap namiesto Map.of() — vyhne sa problémom s generickými typmi
        List<Map<String, Object>> history = checkInRepository
                .findByUserIdOrderByCheckedInAtDesc(uid)
                .stream()
                .map(c -> {
                    Map<String, Object> m = new HashMap<>();
                    m.put("id",              c.getId().toString());
                    m.put("checkedInAt",     c.getCheckedInAt().toString());
                    m.put("method",          c.getMethod() != null ? c.getMethod() : "qr");
                    m.put("durationMinutes", c.getDurationMinutes() != null ? c.getDurationMinutes() : 0);
                    return m;
                })
                .toList();

        return ResponseEntity.ok(history);
    }

    // ── POST /api/checkin/scan ────────────────────────────────────────────────
    @PostMapping("/scan")
    public ResponseEntity<?> scan(@RequestBody Map<String, String> body) {
        String userId = body.get("userId");

        // Ak je to plný QR string, extrahuj userId
        if (userId != null && userId.startsWith("gym-entry:")) {
            String[] parts = userId.split(":");
            if (parts.length >= 2) userId = parts[1];
        }

        if (userId == null) return ResponseEntity.badRequest().body("Chýba userId");

        User user = userRepository.findByIdEquals(UUID.fromString(userId))
                .orElseThrow(() -> new RuntimeException("Používateľ nenájdený"));

        CheckIn checkIn = new CheckIn();
        checkIn.setUser(user);
        checkIn.setCheckedInAt(LocalDateTime.now());
        checkIn.setMethod("qr");
        checkInRepository.save(checkIn);

        Map<String, Object> response = new HashMap<>();
        response.put("message", "Vstup zaznamenaný");
        response.put("userId", userId);
        response.put("fullName", user.getFullName());
        response.put("email", user.getEmail());
        return ResponseEntity.ok(response);
    }

    // ── GET /api/checkin/today ────────────────────────────────────────────────
    @GetMapping("/today")
    public ResponseEntity<?> getTodayCheckins(
            @AuthenticationPrincipal UserDetails userDetails) {

        if (userDetails == null) return ResponseEntity.status(401).build();

        User caller = userRepository.findByEmail(userDetails.getUsername()).orElse(null);
        if (caller == null) return ResponseEntity.status(401).build();

        if (!caller.getRole().equalsIgnoreCase("admin") &&
                !caller.getRole().equalsIgnoreCase("reception")) {
            return ResponseEntity.status(403).body("Nemáš oprávnenie");
        }

        LocalDateTime startOfDay = LocalDateTime.now().toLocalDate().atStartOfDay();
        LocalDateTime endOfDay   = startOfDay.plusDays(1);

        List<Map<String, Object>> result = checkInRepository
                .findByCheckedInAtBetweenOrderByCheckedInAtDesc(startOfDay, endOfDay)
                .stream()
                .map(c -> {
                    Map<String, Object> m = new HashMap<>();
                    m.put("checkedAt", c.getCheckedInAt().toString());
                    m.put("fullName",  c.getUser() != null ? c.getUser().getFullName() : "—");
                    m.put("email",     c.getUser() != null ? c.getUser().getEmail() : "—");
                    return m;
                })
                .toList();

        return ResponseEntity.ok(result);
    }
}