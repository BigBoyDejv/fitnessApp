package sk.fitness.backend.controller;

import sk.fitness.backend.model.User;
import sk.fitness.backend.repository.CheckInRepository;
import sk.fitness.backend.repository.GymClassRepository;
import sk.fitness.backend.repository.UserRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
public class TrainerAndStatsController {

    private final UserRepository userRepository;
    private final GymClassRepository gymClassRepository;
    private final CheckInRepository checkInRepository;

    public TrainerAndStatsController(UserRepository userRepository,
                                     GymClassRepository gymClassRepository,
                                     CheckInRepository checkInRepository) {
        this.userRepository = userRepository;
        this.gymClassRepository = gymClassRepository;
        this.checkInRepository = checkInRepository;
    }

    // ── GET /api/trainer/list ─────────────────────────────────────────────────
    @GetMapping("/api/trainer/list")
    public ResponseEntity<List<Map<String, Object>>> getTrainers() {
        // findByRole je definovaný v UserRepository nižšie
        List<Map<String, Object>> trainers = userRepository.findByRole("trainer")
                .stream()
                .map(t -> {
                    Map<String, Object> m = new HashMap<>();
                    m.put("id",             t.getId().toString());
                    m.put("fullName",       t.getFullName() != null ? t.getFullName() : "—");
                    m.put("email",          t.getEmail());
                    m.put("specialization", t.getSpecialization() != null ? t.getSpecialization() : "Tréner");
                    return m;
                })
                .toList();
        return ResponseEntity.ok(trainers);
    }

    // ── GET /api/trainer/classes ──────────────────────────────────────────────
    @GetMapping("/api/trainer/classes")
    public ResponseEntity<?> getMyTrainerClasses(
            @AuthenticationPrincipal UserDetails userDetails) {

        User trainer = resolveUser(userDetails);
        if (trainer == null) return ResponseEntity.status(401).build();

        // findByInstructor je definovaný v GymClassRepository nižšie
        List<Map<String, Object>> classes = gymClassRepository
                .findByInstructor(trainer.getFullName())
                .stream()
                .map(gc -> {
                    Map<String, Object> m = new HashMap<>();
                    m.put("id",        gc.getId());
                    m.put("name",      gc.getName());
                    m.put("startTime", gc.getStartTime().toString());
                    m.put("endTime",   gc.getEndTime().toString());
                    m.put("capacity",  gc.getCapacity());
                    m.put("booked",    gc.getBooked());
                    m.put("location",  gc.getLocation() != null ? gc.getLocation() : "");
                    return m;
                })
                .toList();

        return ResponseEntity.ok(classes);
    }

    // ── GET /api/stats/my ─────────────────────────────────────────────────────
    @GetMapping("/api/stats/my")
    public ResponseEntity<?> getMyStats(
            @AuthenticationPrincipal UserDetails userDetails) {

        User user = resolveUser(userDetails);
        if (user == null) return ResponseEntity.status(401).build();

        UUID uid = user.getId();
        long totalBookings = gymClassRepository.findByReservedUsersContains(user).size();
        long totalCheckins = checkInRepository.countByUserId(uid);

        Map<String, Object> stats = new HashMap<>();
        stats.put("userId",        uid.toString());
        stats.put("totalBookings", totalBookings);
        stats.put("totalCheckins", totalCheckins);
        stats.put("noShows",       0);
        stats.put("streakDays",    calculateStreak(uid));
        stats.put("totalHours",    totalCheckins * 1.5);
        return ResponseEntity.ok(stats);
    }

    // ── Pomocné ───────────────────────────────────────────────────────────────

    private User resolveUser(UserDetails userDetails) {
        if (userDetails == null) return null;
        return userRepository.findByEmail(userDetails.getUsername()).orElse(null);
    }

    private int calculateStreak(UUID userId) {
        var checkins = checkInRepository.findByUserIdOrderByCheckedInAtDesc(userId);
        if (checkins.isEmpty()) return 0;
        int streak = 0;
        var today = LocalDate.now();
        for (var ci : checkins) {
            if (ci.getCheckedInAt().toLocalDate().equals(today.minusDays(streak))) {
                streak++;
            } else break;
        }
        return streak;
    }
}
