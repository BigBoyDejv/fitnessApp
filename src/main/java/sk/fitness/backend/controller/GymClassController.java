package sk.fitness.backend.controller;

import sk.fitness.backend.dto.CreateGymClassRequest;
import sk.fitness.backend.dto.GymClassResponse;
import sk.fitness.backend.model.GymClass;
import sk.fitness.backend.model.User;
import sk.fitness.backend.model.Membership;
import sk.fitness.backend.repository.GymClassRepository;
import sk.fitness.backend.repository.MembershipRepository;
import sk.fitness.backend.repository.UserRepository;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/classes")
public class GymClassController {

    private final GymClassRepository gymClassRepository;
    private final UserRepository userRepository;
    private final MembershipRepository membershipRepository;

    public GymClassController(GymClassRepository gymClassRepository,
                              UserRepository userRepository,
                              MembershipRepository membershipRepository) {
        this.gymClassRepository = gymClassRepository;
        this.userRepository = userRepository;
        this.membershipRepository = membershipRepository;
    }

    // ── GET /api/classes ─────────────────────────────────────────────────────
    // ADMIN: vráti VŠETKY lekcie (vrátane minulých)
    // Ostatní: len nadchádzajúce
    @GetMapping
    public List<GymClassResponse> getClasses(
            @AuthenticationPrincipal UserDetails userDetails) {

        User currentUser = resolveUser(userDetails);
        boolean isAdminOrTrainer = currentUser != null &&
                (isAdmin(currentUser) || "trainer".equalsIgnoreCase(currentUser.getRole()));

        List<GymClass> classes;
        if (isAdminOrTrainer) {
            // Admin / tréner vidí všetky lekcie
            classes = gymClassRepository.findAll();
            classes.sort((a, b) -> a.getStartTime().compareTo(b.getStartTime()));
        } else {
            // Člen vidí len nadchádzajúce
            classes = gymClassRepository.findByStartTimeAfterOrderByStartTimeAsc(LocalDateTime.now());
        }

        return classes.stream()
                .map(gc -> mapToResponse(gc, currentUser))
                .toList();
    }

    // ── GET /api/classes/my ───────────────────────────────────────────────────
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
        return gymClassRepository.findById(id)
                .map(gc -> ResponseEntity.ok(mapToResponse(gc, currentUser)))
                .orElse(ResponseEntity.notFound().build());
    }

    // ── POST /api/classes/{id}/book ───────────────────────────────────────────
    @PostMapping("/{id}/book")
    public ResponseEntity<?> book(
            @PathVariable Long id,
            @AuthenticationPrincipal UserDetails userDetails) {

        User currentUser = resolveUser(userDetails);
        if (currentUser == null) return ResponseEntity.status(401).body(Map.of("message", "Neprihlásený"));

        GymClass gymClass = gymClassRepository.findById(id).orElse(null);
        if (gymClass == null)
            return ResponseEntity.notFound().build();

        // Overenie aktívneho členstva
        boolean hasMembership = membershipRepository
                .findByUserIdAndStatus(currentUser.getId(), Membership.MembershipStatus.active)
                .map(m -> m.isValid())
                .orElse(false);
        if (!hasMembership)
            return ResponseEntity.status(403).body(Map.of(
                    "message", "Na rezerváciu lekcie potrebuješ aktívne členstvo."
            ));

        if (gymClass.getReservedUsers().contains(currentUser))
            return ResponseEntity.badRequest().body(Map.of("message", "Už si rezervovaný na túto lekciu"));

        if (gymClass.getBooked() >= gymClass.getCapacity())
            return ResponseEntity.badRequest().body(Map.of("message", "Lekcia je plná"));

        gymClass.getReservedUsers().add(currentUser);
        gymClass.setBooked(gymClass.getBooked() + 1);
        gymClassRepository.save(gymClass);

        return ResponseEntity.ok(mapToResponse(gymClass, currentUser));
    }

    // ── Starý endpoint — spätná kompatibilita ─────────────────────────────────
    @PostMapping("/{id}/reserve")
    public ResponseEntity<?> reserve(@PathVariable Long id,
                                     @AuthenticationPrincipal UserDetails ud) {
        return book(id, ud);
    }

    // ── DELETE /api/classes/{id}/cancel ──────────────────────────────────────
    @DeleteMapping("/{id}/cancel")
    public ResponseEntity<?> cancel(
            @PathVariable Long id,
            @AuthenticationPrincipal UserDetails userDetails) {

        User currentUser = resolveUser(userDetails);
        if (currentUser == null) return ResponseEntity.status(401).body(Map.of("message", "Neprihlásený"));

        GymClass gymClass = gymClassRepository.findById(id).orElse(null);
        if (gymClass == null) return ResponseEntity.notFound().build();

        if (!gymClass.getReservedUsers().contains(currentUser))
            return ResponseEntity.badRequest().body(Map.of("message", "Nie si rezervovaný na túto lekciu"));

        gymClass.getReservedUsers().remove(currentUser);
        gymClass.setBooked(Math.max(0, gymClass.getBooked() - 1));
        gymClassRepository.save(gymClass);

        return ResponseEntity.ok(Map.of("message", "Rezervácia zrušená"));
    }

    @PostMapping("/{id}/cancel")
    public ResponseEntity<?> cancelPost(@PathVariable Long id,
                                        @AuthenticationPrincipal UserDetails ud) {
        return cancel(id, ud);
    }

    // ── DELETE /api/classes/{id} ──────────────────────────────────────────────
    // Zmaž lekciu — len admin
    @DeleteMapping("/{id}")
    public ResponseEntity<?> deleteClass(
            @PathVariable Long id,
            @AuthenticationPrincipal UserDetails userDetails) {

        User currentUser = resolveUser(userDetails);
        if (!isAdmin(currentUser))
            return ResponseEntity.status(403).body(Map.of("message", "Len admin môže mazať lekcie"));

        if (!gymClassRepository.existsById(id))
            return ResponseEntity.notFound().build();

        gymClassRepository.deleteById(id);
        return ResponseEntity.ok(Map.of("message", "Lekcia zmazaná"));
    }

    // ── POST /api/classes ─────────────────────────────────────────────────────
    // Vytvor lekciu — len admin alebo trainer
    // Frontend posiela: { name, type, startTime, durationMinutes, capacity, location, description, instructor, trainerId }
    @PostMapping
    public ResponseEntity<?> createClass(
            @Valid @RequestBody CreateGymClassRequest request,
            @AuthenticationPrincipal UserDetails userDetails) {

        User currentUser = resolveUser(userDetails);

        // FIX 3: manuálna kontrola roly (bez ROLE_ prefixu)
        if (currentUser == null ||
                (!isAdmin(currentUser) && !"trainer".equalsIgnoreCase(currentUser.getRole()))) {
            return ResponseEntity.status(403).body(Map.of("message", "Nemáš oprávnenie vytvárať lekcie"));
        }

        // FIX 2: parsovanie startTime + výpočet endTime
        LocalDateTime startTime;
        try {
            startTime = LocalDateTime.parse(request.startTime());
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("message", "Neplatný formát dátumu: " + request.startTime()));
        }

        int duration = (request.durationMinutes() != null && request.durationMinutes() > 0)
                ? request.durationMinutes()
                : 60;
        LocalDateTime endTime = startTime.plusMinutes(duration);

        // FIX 4: nastavenie instructor mena
        String instructorName = request.instructor();
        if (instructorName == null || instructorName.isBlank()) {
            // Fallback — použi meno aktuálne prihláseného trénera
            instructorName = currentUser.getFullName() != null ? currentUser.getFullName() : "—";
        }

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

    // ── Pomocné metódy ────────────────────────────────────────────────────────

    private User resolveUser(UserDetails userDetails) {
        if (userDetails == null) return null;
        return userRepository.findByEmail(userDetails.getUsername()).orElse(null);
    }

    private boolean isAdmin(User user) {
        return user != null && "admin".equalsIgnoreCase(user.getRole());
    }

    private GymClassResponse mapToResponse(GymClass gc, User currentUser) {
        boolean isReserved = currentUser != null && gc.getReservedUsers().contains(currentUser);
        int duration = (gc.getStartTime() != null && gc.getEndTime() != null)
                ? (int) java.time.Duration.between(gc.getStartTime(), gc.getEndTime()).toMinutes()
                : 60;
        return new GymClassResponse(
                gc.getId(),
                gc.getName(),
                gc.getInstructor(),
                gc.getStartTime(),
                gc.getEndTime(),
                gc.getCapacity(),
                gc.getBooked(),
                gc.getBooked() >= gc.getCapacity(),
                isReserved,
                gc.getLocation(),
                duration
        );
    }
}
