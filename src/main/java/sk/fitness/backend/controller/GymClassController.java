package sk.fitness.backend.controller;

import sk.fitness.backend.dto.CreateGymClassRequest;
import sk.fitness.backend.dto.GymClassResponse;
import sk.fitness.backend.model.*;
import sk.fitness.backend.repository.ClassReservationRepository;
import sk.fitness.backend.repository.GymClassRepository;
import sk.fitness.backend.repository.MembershipRepository;
import sk.fitness.backend.repository.UserRepository;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.UUID;
import java.util.List;
import java.util.Map;
import java.util.HashMap;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/classes")
public class GymClassController {

    private final GymClassRepository gymClassRepository;
    private final UserRepository userRepository;
    private final MembershipRepository membershipRepository;
    private final ClassReservationRepository classReservationRepository;

    public GymClassController(GymClassRepository gymClassRepository,
                               UserRepository userRepository,
                               MembershipRepository membershipRepository,
                               ClassReservationRepository classReservationRepository) {
        this.gymClassRepository = gymClassRepository;
        this.userRepository = userRepository;
        this.membershipRepository = membershipRepository;
        this.classReservationRepository = classReservationRepository;
    }

    // ── GET /api/classes ─────────────────────────────────────────────────────
    @Transactional(readOnly = true)
    @GetMapping
    public List<GymClassResponse> getClasses(
            @AuthenticationPrincipal UserDetails userDetails) {

        User currentUser = resolveUser(userDetails);
        boolean isAdminOrTrainer = currentUser != null &&
                (isAdmin(currentUser) || "trainer".equalsIgnoreCase(currentUser.getRole()));

        List<GymClass> classes;
        if (isAdminOrTrainer) {
            classes = gymClassRepository.findAll();
            classes.sort((a, b) -> a.getStartTime().compareTo(b.getStartTime()));
        } else {
            classes = gymClassRepository.findByStartTimeAfterOrderByStartTimeAsc(LocalDateTime.now());
        }

        return classes.stream()
                .map(gc -> mapToResponse(gc, currentUser))
                .toList();
    }

    // ── GET /api/classes/my ───────────────────────────────────────────────────
    @Transactional(readOnly = true)
    @GetMapping("/my")
    public ResponseEntity<List<GymClassResponse>> getMyClasses(
            @AuthenticationPrincipal UserDetails userDetails) {

        User currentUser = resolveUser(userDetails);
        if (currentUser == null) return ResponseEntity.status(401).build();

        List<GymClassResponse> myClasses = gymClassRepository
                .findByReservations_User(currentUser)
                .stream()
                .map(gc -> mapToResponse(gc, currentUser))
                .toList();

        return ResponseEntity.ok(myClasses);
    }

    // ── GET /api/classes/{id} ─────────────────────────────────────────────────
    @Transactional(readOnly = true)
    @GetMapping("/{id}")
    public ResponseEntity<GymClassResponse> getClassDetail(
            @PathVariable Long id,
            @AuthenticationPrincipal UserDetails userDetails) {

        User currentUser = resolveUser(userDetails);
        return gymClassRepository.findById(id)
                .map(gc -> ResponseEntity.ok(mapToResponse(gc, currentUser)))
                .orElse(ResponseEntity.notFound().build());
    }

    // ── POST /api/classes/{id}/book ───────────────────────────────────────────
    @Transactional
    @PostMapping("/{id}/book")
    public ResponseEntity<?> book(
            @PathVariable Long id,
            @AuthenticationPrincipal UserDetails userDetails) {

        User currentUser = resolveUser(userDetails);
        if (currentUser == null) return ResponseEntity.status(401).body(Map.of("message", "Neprihlásený"));

        GymClass gymClass = gymClassRepository.findById(id).orElse(null);
        if (gymClass == null) return ResponseEntity.notFound().build();

        // Skontroluj či má uźívateľ aktívne členstvo (robustnejšie cez List)
        boolean hasMembership = membershipRepository
                .findByUserIdOrderByCreatedAtDesc(currentUser.getId())
                .stream()
                .anyMatch(m -> m.getStatus() == Membership.MembershipStatus.active && m.isValid());

        if (!hasMembership) return ResponseEntity.badRequest().body(Map.of("message", "Nemáš aktívne členstvo"));

        if (gymClass.getBooked() >= gymClass.getCapacity())
            return ResponseEntity.badRequest().body(Map.of("message", "Lekcia je plná"));

        if (classReservationRepository.existsByGymClassAndUser(gymClass, currentUser))
            return ResponseEntity.badRequest().body(Map.of("message", "Už si rezervovaný na túto lekciu"));

        ClassReservation res = new ClassReservation(gymClass, currentUser);
        classReservationRepository.save(res);

        gymClass.setBooked(gymClass.getBooked() + 1);
        // gymClassRepository.save(gymClass); // Hibernate uloží automaticky v @Transactional

        return ResponseEntity.ok(mapToResponse(gymClass, currentUser));
    }

    @PostMapping("/{id}/reserve")
    public ResponseEntity<?> reserve(@PathVariable Long id, @AuthenticationPrincipal UserDetails ud) {
        return book(id, ud);
    }

    // ── DELETE /api/classes/{id}/cancel ──────────────────────────────────────
    @Transactional
    @DeleteMapping("/{id}/cancel")
    public ResponseEntity<?> cancel(
            @PathVariable Long id,
            @AuthenticationPrincipal UserDetails userDetails) {

        User currentUser = resolveUser(userDetails);
        if (currentUser == null) return ResponseEntity.status(401).body(Map.of("message", "Neprihlásený"));

        GymClass gymClass = gymClassRepository.findById(id).orElse(null);
        if (gymClass == null) return ResponseEntity.notFound().build();

        ClassReservation res = classReservationRepository.findByGymClassAndUser(gymClass, currentUser).orElse(null);
        if (res == null) return ResponseEntity.badRequest().body(Map.of("message", "Nie si prihlásený na túto lekciu"));

        classReservationRepository.delete(res);
        gymClass.getReservations().remove(res);
        gymClass.setBooked(Math.max(0, gymClass.getBooked() - 1));
        gymClassRepository.save(gymClass);

        return ResponseEntity.ok(Map.of("message", "Rezervácia zrušená"));
    }

    @Transactional
    @PostMapping("/{id}/cancel")
    public ResponseEntity<?> cancelPost(@PathVariable Long id, @AuthenticationPrincipal UserDetails ud) {
        return cancel(id, ud);
    }

    // ── TRAINER/ADMIN: Get participants ─────────────────────────────────────
    @Transactional(readOnly = true)
    @GetMapping("/{id}/participants")
    public ResponseEntity<?> getParticipants(
            @PathVariable Long id,
            @AuthenticationPrincipal UserDetails userDetails) {

        User currentUser = resolveUser(userDetails);
        if (currentUser == null || (!isAdmin(currentUser) && !"trainer".equalsIgnoreCase(currentUser.getRole())))
            return ResponseEntity.status(403).body(Map.of("message", "Prístup zamietnutý"));

        GymClass gymClass = gymClassRepository.findById(id).orElse(null);
        if (gymClass == null) return ResponseEntity.notFound().build();

        List<Map<String, Object>> participants = gymClass.getReservations().stream()
                .map(r -> {
                    Map<String, Object> m = new HashMap<>();
                    m.put("id", r.getId());
                    m.put("userId", r.getUser().getId().toString());
                    m.put("fullName", r.getUser().getFullName());
                    m.put("email", r.getUser().getEmail());
                    m.put("status", r.getStatus());
                    m.put("reservedAt", r.getReservedAt());
                    return m;
                }).collect(Collectors.toList());

        return ResponseEntity.ok(participants);
    }

    // ── TRAINER: Update participant attendance ─────────────────────────────
    @Transactional
    @PatchMapping("/{classId}/attendance/{userId}")
    public ResponseEntity<?> updateAttendance(
            @PathVariable Long classId,
            @PathVariable UUID userId,
            @RequestBody Map<String, String> body,
            @AuthenticationPrincipal UserDetails userDetails) {

        User currentUser = resolveUser(userDetails);
        if (currentUser == null || (!isAdmin(currentUser) && !"trainer".equalsIgnoreCase(currentUser.getRole())))
            return ResponseEntity.status(403).build();

        GymClass gymClass = gymClassRepository.findById(classId).orElse(null);
        User targetUser = userRepository.findById(userId).orElse(null);
        if (gymClass == null || targetUser == null) return ResponseEntity.notFound().build();

        ClassReservation res = classReservationRepository.findByGymClassAndUser(gymClass, targetUser).orElse(null);
        if (res == null) return ResponseEntity.badRequest().body(Map.of("message", "Rezervácia nenájdená"));

        String statusStr = body.get("status");
        try {
            res.setStatus(AttendanceStatus.valueOf(statusStr));
            classReservationRepository.save(res);
            return ResponseEntity.ok(Map.of("message", "Status upravený", "status", res.getStatus()));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("message", "Neplatný status"));
        }
    }

    // ── DELETE /api/classes/{id} ──────────────────────────────────────────────
    @DeleteMapping("/{id}")
    public ResponseEntity<?> deleteClass(
            @PathVariable Long id,
            @AuthenticationPrincipal UserDetails userDetails) {

        User currentUser = resolveUser(userDetails);
        if (!isAdmin(currentUser)) return ResponseEntity.status(403).body(Map.of("message", "Len admin môže mazať lekcie"));
        if (!gymClassRepository.existsById(id)) return ResponseEntity.notFound().build();
        gymClassRepository.deleteById(id);
        return ResponseEntity.ok(Map.of("message", "Lekcia zmazaná"));
    }

    // ── POST /api/classes ─────────────────────────────────────────────────────
    @PostMapping
    public ResponseEntity<?> createClass(
            @Valid @RequestBody CreateGymClassRequest request,
            @AuthenticationPrincipal UserDetails userDetails) {

        User currentUser = resolveUser(userDetails);
        if (currentUser == null || (!isAdmin(currentUser) && !"trainer".equalsIgnoreCase(currentUser.getRole())))
            return ResponseEntity.status(403).body(Map.of("message", "Nemáš oprávnenie vytvárať lekcie"));

        LocalDateTime startTime;
        try {
            startTime = LocalDateTime.parse(request.startTime());
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("message", "Neplatný formát dátumu"));
        }

        int duration = (request.durationMinutes() != null && request.durationMinutes() > 0) ? request.durationMinutes() : 60;
        LocalDateTime endTime = startTime.plusMinutes(duration);

        String instructorName = request.instructor();
        if (instructorName == null || instructorName.isBlank()) instructorName = currentUser.getFullName();

        GymClass gymClass = new GymClass();
        gymClass.setName(request.name());
        gymClass.setInstructor(instructorName);
        gymClass.setStartTime(startTime);
        gymClass.setEndTime(endTime);
        gymClass.setCapacity(request.capacity() != null ? request.capacity() : 20);
        gymClass.setLocation(request.location() != null ? request.location() : "");
        gymClass.setBooked(0);

        gymClassRepository.save(gymClass);
        return ResponseEntity.ok(mapToResponse(gymClass, currentUser));
    }

    private User resolveUser(UserDetails userDetails) {
        if (userDetails == null) return null;
        return userRepository.findByEmail(userDetails.getUsername()).orElse(null);
    }

    private boolean isAdmin(User user) {
        return user != null && "admin".equalsIgnoreCase(user.getRole());
    }

    private GymClassResponse mapToResponse(GymClass gc, User currentUser) {
        boolean isReserved = false;
        if (currentUser != null) {
            isReserved = classReservationRepository.existsByGymClassAndUser(gc, currentUser);
        }

        int duration = (gc.getStartTime() != null && gc.getEndTime() != null)
                ? (int) java.time.Duration.between(gc.getStartTime(), gc.getEndTime()).toMinutes()
                : 60;

        boolean isFull = false;
        if (gc.getBooked() != null && gc.getCapacity() != null) {
            isFull = gc.getBooked() >= gc.getCapacity();
        }

        return new GymClassResponse(
                gc.getId(), gc.getName(), gc.getInstructor(), gc.getStartTime(), gc.getEndTime(),
                gc.getCapacity() != null ? gc.getCapacity() : 0, 
                gc.getBooked() != null ? gc.getBooked() : 0, 
                isFull, isReserved,
                gc.getLocation() != null ? gc.getLocation() : "", duration
        );
    }
}
