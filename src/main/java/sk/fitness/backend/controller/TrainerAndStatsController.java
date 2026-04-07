package sk.fitness.backend.controller;

import jakarta.transaction.Transactional;
import sk.fitness.backend.model.User;
import sk.fitness.backend.repository.CheckInRepository;
import sk.fitness.backend.repository.GymClassRepository;
import sk.fitness.backend.repository.UserRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.time.LocalDateTime;

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
                    m.put("avatarUrl",      t.getAvatarUrl());
                    m.put("bio", t.getBio() != null ? t.getBio() : "");
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
        long totalBookings = gymClassRepository.findByReservations_User(user).size();
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

    // ── GET /api/stats/occupancy ──────────────────────────────────────────────
    @GetMapping("/api/stats/occupancy")
    public ResponseEntity<?> getOccupancy() {
        try {
            LocalDateTime now = LocalDateTime.now();
            LocalDateTime since = now.minusMinutes(90);
            long count = checkInRepository.countBetween(since, now);

            int maxCapacity = 80;

            Map<String, Object> res = new HashMap<>();
            res.put("count", count);
            res.put("maxCapacity", maxCapacity);
            res.put("percentage", Math.min(100, (int) ((count * 100.0) / maxCapacity)));
            res.put("status", count < 30 ? "OPTIMAL" : (count < 60 ? "BUSY" : "FULL"));
            res.put("label", count < 30 ? "Optimálne" : (count < 60 ? "Plnšie" : "Plno"));

            return ResponseEntity.ok(res);
        } catch (Exception e) {
            // Fallback placeholder v prípade chyby DB
            Map<String, Object> fallback = new HashMap<>();
            fallback.put("count", 15);
            fallback.put("maxCapacity", 80);
            fallback.put("percentage", 18);
            fallback.put("status", "OPTIMAL");
            fallback.put("label", "Optimálne (odhad)");
            return ResponseEntity.ok(fallback);
        }
    }


    // ── Pomocné ───────────────────────────────────────────────────────────────


    // ── GET /api/trainer/clients ──────────────────────────────────────────────
    // Vracia zoznam členov priradených k trénera
    @GetMapping("/api/trainer/clients")
    public ResponseEntity<?> getMyClients(
            @AuthenticationPrincipal UserDetails userDetails) {
        User trainer = resolveUser(userDetails);
        if (trainer == null) return ResponseEntity.status(401).build();

        List<Map<String, Object>> clients = userRepository.findByTrainerId(trainer.getId())
                .stream()
                .map(u -> {
                    Map<String, Object> m = new HashMap<>();
                    m.put("id",       u.getId().toString());
                    m.put("fullName", u.getFullName());
                    m.put("email",    u.getEmail());
                    m.put("phone",    u.getPhone());
                    m.put("active",     Boolean.TRUE.equals(u.getIsActive()));
                    m.put("avatarUrl",  u.getAvatarUrl());
                    return m;
                })
                .toList();
        return ResponseEntity.ok(clients);
    }

    // ── POST /api/trainer/clients ─────────────────────────────────────────────
    // Priraď člena k trénera
    // Body: { memberId: "uuid" }
    @Transactional
    @PostMapping("/api/trainer/clients")
    public ResponseEntity<?> addClient(
            @RequestBody Map<String, String> body,
            @AuthenticationPrincipal UserDetails userDetails) {
        User trainer = resolveUser(userDetails);
        if (trainer == null) return ResponseEntity.status(401).build();

        String memberId = body.get("memberId");
        if (memberId == null) return ResponseEntity.badRequest().body(Map.of("message", "Chýba memberId"));

        User member = userRepository.findByIdEquals(UUID.fromString(memberId)).orElse(null);
        if (member == null) return ResponseEntity.badRequest().body(Map.of("message", "Člen nenájdený"));

        member.setTrainerId(trainer.getId());
        userRepository.save(member);
        return ResponseEntity.ok(Map.of("message", "Cvičenec priradený", "memberId", memberId));
    }

    // ── DELETE /api/trainer/clients/{memberId} ────────────────────────────────
    // Odober člena od trénera
    @Transactional
    @DeleteMapping("/api/trainer/clients/{memberId}")
    public ResponseEntity<?> removeClient(
            @PathVariable String memberId,
            @AuthenticationPrincipal UserDetails userDetails) {
        User trainer = resolveUser(userDetails);
        if (trainer == null) return ResponseEntity.status(401).build();

        User member = userRepository.findByIdEquals(UUID.fromString(memberId)).orElse(null);
        if (member == null) return ResponseEntity.notFound().build();

        if (member.getTrainerId() == null || !trainer.getId().equals(member.getTrainerId()))
            return ResponseEntity.status(403).body(Map.of("message", "Tento člen nie je tvoj cvičenec"));

        member.setTrainerId(null);
        userRepository.save(member);
        return ResponseEntity.ok(Map.of("message", "Spolupráca ukončená"));
    }

    // ── POST /api/trainer/terminate ───────────────────────────────────────────
    // Koniec spolupráce Z POHĽADU ČLENA
    @Transactional
    @PostMapping("/api/trainer/terminate")
    public ResponseEntity<?> terminateCooperation(@AuthenticationPrincipal UserDetails userDetails) {
        User member = resolveUser(userDetails);
        if (member == null) return ResponseEntity.status(401).build();
        
        if (member.getTrainerId() == null) 
            return ResponseEntity.badRequest().body(Map.of("message", "Nemáš priradeného žiadneho trénera"));

        member.setTrainerId(null);
        userRepository.save(member);
        return ResponseEntity.ok(Map.of("message", "Spolupráca s trénerom bola ukončená"));
    }

    // ── GET /api/trainer/available-members ───────────────────────────────────
    // Všetci členovia (pre picker) — bez admin oprávnení
    @GetMapping("/api/trainer/available-members")
    public ResponseEntity<?> getAvailableMembers(
            @AuthenticationPrincipal UserDetails userDetails) {
        User trainer = resolveUser(userDetails);
        if (trainer == null) return ResponseEntity.status(401).build();

        List<Map<String, Object>> members = userRepository.findByRole("member")
                .stream()
                .map(u -> {
                    Map<String, Object> m = new HashMap<>();
                    m.put("id",       u.getId().toString());
                    m.put("fullName", u.getFullName());
                    m.put("email",    u.getEmail());
                    m.put("role",     u.getRole());
                    return m;
                })
                .toList();
        return ResponseEntity.ok(members);
    }

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