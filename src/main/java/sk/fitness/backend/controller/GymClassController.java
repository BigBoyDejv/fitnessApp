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

    // Zobraziť všetky nadchádzajúce lekcie
    @GetMapping
    public List<GymClassResponse> getUpcomingClasses(@AuthenticationPrincipal User currentUser) {
        LocalDateTime now = LocalDateTime.now();
        return gymClassRepository.findByStartTimeAfterOrderByStartTimeAsc(now)
                .stream()
                .map(gymClass -> mapToResponse(gymClass, currentUser))
                .toList();
    }

    // Detail jednej lekcie
    @GetMapping("/{id}")
    public ResponseEntity<GymClassResponse> getClassDetail(@PathVariable Long id, @AuthenticationPrincipal User currentUser) {
        GymClass gymClass = gymClassRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Lekcia nenájdená"));

        return ResponseEntity.ok(mapToResponse(gymClass, currentUser));
    }

    // Rezervovať miesto
    @PostMapping("/{id}/reserve")
    public ResponseEntity<?> reserve(@PathVariable Long id, @AuthenticationPrincipal User currentUser) {
        GymClass gymClass = gymClassRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Lekcia nenájdená"));

        if (gymClass.getBooked() >= gymClass.getCapacity()) {
            return ResponseEntity.badRequest().body("Lekcia je plná");
        }
        if (gymClass.getReservedUsers().contains(currentUser)) {
            return ResponseEntity.badRequest().body("Už si rezervovaný");
        }

        gymClass.getReservedUsers().add(currentUser);
        gymClass.setBooked(gymClass.getBooked() + 1);
        gymClassRepository.save(gymClass);

        return ResponseEntity.ok().build();
    }

    // Zrušiť rezerváciu
    @PostMapping("/{id}/cancel")
    public ResponseEntity<?> cancel(@PathVariable Long id, @AuthenticationPrincipal User currentUser) {
        GymClass gymClass = gymClassRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Lekcia nenájdená"));

        if (!gymClass.getReservedUsers().contains(currentUser)) {
            return ResponseEntity.badRequest().body("Nie si rezervovaný");
        }

        gymClass.getReservedUsers().remove(currentUser);
        gymClass.setBooked(gymClass.getBooked() - 1);
        gymClassRepository.save(gymClass);

        return ResponseEntity.ok().build();
    }

    // Vytvoriť novú lekciu – len pre ADMIN alebo TRAINER
    @PostMapping
    @PreAuthorize("hasRole('ADMIN') or hasRole('TRAINER')")
    public ResponseEntity<GymClassResponse> createClass(@Valid @RequestBody CreateGymClassRequest request,
                                                        @AuthenticationPrincipal User currentUser) {
        GymClass gymClass = new GymClass();
        gymClass.setName(request.name());
        gymClass.setInstructor(request.instructor());
        gymClass.setStartTime(request.startTime());
        gymClass.setEndTime(request.endTime());
        gymClass.setCapacity(request.capacity());
        gymClass.setLocation(request.location());

        gymClassRepository.save(gymClass);

        return ResponseEntity.ok(mapToResponse(gymClass, currentUser));
    }

    // Pomocná metóda na mapovanie
    private GymClassResponse mapToResponse(GymClass gymClass, User currentUser) {
        boolean isReserved = currentUser != null && gymClass.getReservedUsers().contains(currentUser);
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