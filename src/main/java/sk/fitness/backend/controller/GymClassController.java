package sk.fitness.backend.controller;

import sk.fitness.backend.dto.CreateGymClassRequest;
import sk.fitness.backend.dto.GymClassResponse;
import sk.fitness.backend.model.GymClass;
import sk.fitness.backend.model.User;
import sk.fitness.backend.repository.GymClassRepository;
import sk.fitness.backend.repository.UserRepository;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.List;

@RestController
@RequestMapping("/api/classes")
public class GymClassController {

    private final GymClassRepository gymClassRepository;
    private final UserRepository userRepository;

    public GymClassController(GymClassRepository gymClassRepository, UserRepository userRepository) {
        this.gymClassRepository = gymClassRepository;
        this.userRepository = userRepository;
    }

    // ── GET /api/classes ─────────────────────────────────────────────────────
    // Všetky nadchádzajúce lekcie (pre výber pri rezervácii)
    @GetMapping
    public List<GymClassResponse> getUpcomingClasses(
            @AuthenticationPrincipal UserDetails userDetails) {

        User currentUser = resolveUser(userDetails);
        LocalDateTime now = LocalDateTime.now();
        return gymClassRepository.findByStartTimeAfterOrderByStartTimeAsc(now)
                .stream()
                .map(gc -> mapToResponse(gc, currentUser))
                .toList();
    }

    // ── GET /api/classes/my ───────────────────────────────────────────────────
    // Lekcie na ktoré je prihlásený aktuálny používateľ
    @GetMapping("/my")
    public ResponseEntity<List<GymClassResponse>> getMyClasses(
            @AuthenticationPrincipal UserDetails userDetails) {

        User currentUser = resolveUser(userDetails);
        if (currentUser == null) return ResponseEntity.status(401).build();

        List<GymClassResponse> myClasses = gymClassRepository
                .findByReservedUsersContains(currentUser)
                .stream()
                .map(gc -> mapToResponse(gc, currentUser))
                .toList();

        return ResponseEntity.ok(myClasses);
    }

    // ── GET /api/classes/{id} ─────────────────────────────────────────────────
    @GetMapping("/{id}")
    public ResponseEntity<GymClassResponse> getClassDetail(
            @PathVariable Long id,
            @AuthenticationPrincipal UserDetails userDetails) {

        User currentUser = resolveUser(userDetails);
        GymClass gymClass = gymClassRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Lekcia nenájdená"));

        return ResponseEntity.ok(mapToResponse(gymClass, currentUser));
    }

    // ── POST /api/classes/{id}/book ───────────────────────────────────────────
    // Rezervuj lekciu (nový endpoint kompatibilný s member.html)
    @PostMapping("/{id}/book")
    public ResponseEntity<?> book(
            @PathVariable Long id,
            @AuthenticationPrincipal UserDetails userDetails) {

        User currentUser = resolveUser(userDetails);
        if (currentUser == null) return ResponseEntity.status(401).body("Neprihlásený");

        GymClass gymClass = gymClassRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Lekcia nenájdená"));

        if (gymClass.getReservedUsers().contains(currentUser)) {
            return ResponseEntity.badRequest().body("Už si rezervovaný na túto lekciu");
        }
        if (gymClass.getBooked() >= gymClass.getCapacity()) {
            return ResponseEntity.badRequest().body("Lekcia je plná");
        }

        gymClass.getReservedUsers().add(currentUser);
        gymClass.setBooked(gymClass.getBooked() + 1);
        gymClassRepository.save(gymClass);

        return ResponseEntity.ok(mapToResponse(gymClass, currentUser));
    }

    // ── POST /api/classes/{id}/reserve ───────────────────────────────────────
    // Starý endpoint — zachovaný pre spätnú kompatibilitu
    @PostMapping("/{id}/reserve")
    public ResponseEntity<?> reserve(
            @PathVariable Long id,
            @AuthenticationPrincipal UserDetails userDetails) {
        return book(id, userDetails);
    }

    // ── DELETE /api/classes/{id}/cancel ──────────────────────────────────────
    // Zruš rezerváciu (member.html používa DELETE)
    @DeleteMapping("/{id}/cancel")
    public ResponseEntity<?> cancel(
            @PathVariable Long id,
            @AuthenticationPrincipal UserDetails userDetails) {

        User currentUser = resolveUser(userDetails);
        if (currentUser == null) return ResponseEntity.status(401).body("Neprihlásený");

        GymClass gymClass = gymClassRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Lekcia nenájdená"));

        if (!gymClass.getReservedUsers().contains(currentUser)) {
            return ResponseEntity.badRequest().body("Nie si rezervovaný na túto lekciu");
        }

        gymClass.getReservedUsers().remove(currentUser);
        gymClass.setBooked(gymClass.getBooked() - 1);
        gymClassRepository.save(gymClass);

        return ResponseEntity.ok("Rezervácia zrušená");
    }

    // ── POST /api/classes/{id}/cancel ────────────────────────────────────────
    // Starý endpoint — zachovaný pre spätnú kompatibilitu
    @PostMapping("/{id}/cancel")
    public ResponseEntity<?> cancelPost(
            @PathVariable Long id,
            @AuthenticationPrincipal UserDetails userDetails) {
        return cancel(id, userDetails);
    }

    // ── POST /api/classes ─────────────────────────────────────────────────────
    // Vytvor novú lekciu — len ADMIN alebo TRAINER
    @PostMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'TRAINER')")
    public ResponseEntity<GymClassResponse> createClass(
            @Valid @RequestBody CreateGymClassRequest request,
            @AuthenticationPrincipal UserDetails userDetails) {

        User currentUser = resolveUser(userDetails);

        GymClass gymClass = new GymClass();
        gymClass.setName(request.name());
        gymClass.setInstructor(request.instructor());
        gymClass.setStartTime(request.startTime());
        gymClass.setEndTime(request.endTime());
        gymClass.setCapacity(request.capacity());
        gymClass.setLocation(request.location());
        gymClass.setBooked(0);

        gymClassRepository.save(gymClass);
        return ResponseEntity.ok(mapToResponse(gymClass, currentUser));
    }

    // ── Pomocné metódy ────────────────────────────────────────────────────────

    private User resolveUser(UserDetails userDetails) {
        if (userDetails == null) return null;
        return userRepository.findByEmail(userDetails.getUsername()).orElse(null);
    }

    private GymClassResponse mapToResponse(GymClass gymClass, User currentUser) {
        boolean isReserved = currentUser != null
                && gymClass.getReservedUsers().contains(currentUser);
        return new GymClassResponse(
                gymClass.getId(),
                gymClass.getName(),
                gymClass.getInstructor(),
                gymClass.getStartTime(),
                gymClass.getEndTime(),
                gymClass.getCapacity(),
                gymClass.getBooked(),
                gymClass.getBooked() >= gymClass.getCapacity(),
                isReserved,
                gymClass.getLocation()
        );
    }
}
