package sk.fitness.backend.controller;

import sk.fitness.backend.model.User;
import sk.fitness.backend.model.WorkoutPreset;
import sk.fitness.backend.model.ExerciseData;
import sk.fitness.backend.repository.UserRepository;
import sk.fitness.backend.repository.WorkoutPresetRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.*;

@RestController
@RequestMapping("/api/workout-presets")
public class WorkoutPresetController {

    private final WorkoutPresetRepository presetRepo;
    private final UserRepository userRepo;

    public WorkoutPresetController(WorkoutPresetRepository presetRepo,
                                   UserRepository userRepo) {
        this.presetRepo = presetRepo;
        this.userRepo = userRepo;
    }

    // GET /api/workout-presets — zoznam presetov usera (+ zdieľané od trénera)
    @GetMapping
    public ResponseEntity<?> list(@AuthenticationPrincipal UserDetails ud) {
        User user = resolve(ud);
        if (user == null) return ResponseEntity.status(401).build();

        // Moje presety
        List<WorkoutPreset> myPresets = presetRepo.findByUserIdOrderByLastUsedAtDescNameAsc(user.getId());
        
        // Zdieľané presety od trénera
        List<WorkoutPreset> sharedPresets = new ArrayList<>();
        if (user.getTrainerId() != null) {
            sharedPresets = presetRepo.findByUserIdInAndIsSharedTrueOrderByLastUsedAtDesc(List.of(user.getTrainerId()));
        }

        List<Map<String, Object>> result = new ArrayList<>();
        // Najprv tvoje
        myPresets.forEach(p -> result.add(toDtoLight(p, false)));
        // Potom trénerove (označené ako shared)
        sharedPresets.forEach(p -> result.add(toDtoLight(p, true)));

        return ResponseEntity.ok(result);
    }

    // GET /api/workout-presets/{id} — detail presetu (s cvikmi)
    @GetMapping("/{id}")
    public ResponseEntity<?> get(@PathVariable UUID id,
                                 @AuthenticationPrincipal UserDetails ud) {
        User user = resolve(ud);
        if (user == null) return ResponseEntity.status(401).build();

        return presetRepo.findById(id)
                .filter(p -> p.getUser().getId().equals(user.getId()) || 
                           (p.getIsShared() && user.getTrainerId() != null && p.getUser().getId().equals(user.getTrainerId())))
                .map(this::toDtoFull)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    // POST /api/workout-presets — vytvor preset
    @PostMapping
    public ResponseEntity<?> create(@RequestBody WorkoutPresetRequest request,
                                    @AuthenticationPrincipal UserDetails ud) {

        User user = resolve(ud);
        if (user == null) {
            return ResponseEntity.status(401).body(Map.of("message", "User not authenticated"));
        }

        String name = request.getName();
        if (name == null || name.isBlank()) {
            return ResponseEntity.badRequest()
                    .body(Map.of("message", "Chýba názov presetu"));
        }

        WorkoutPreset preset = new WorkoutPreset();
        preset.setUser(user);
        preset.setName(name.trim());

        // Ak exercises nie sú poskytnuté, nastav prázdny list
        preset.setExercises(request.getExercises() != null ? request.getExercises() : List.of());

        preset.setUseCount(0);
        preset.setCreatedAt(LocalDateTime.now());

        presetRepo.save(preset);

        return ResponseEntity.ok(toDtoFull(preset));
    }

    // PUT /api/workout-presets/{id} — aktualizuj preset
    @PutMapping("/{id}")
    public ResponseEntity<?> update(@PathVariable UUID id,
                                    @RequestBody WorkoutPresetRequest request,
                                    @AuthenticationPrincipal UserDetails ud) {
        User user = resolve(ud);
        if (user == null) return ResponseEntity.status(401).build();

        WorkoutPreset preset = presetRepo.findById(id).orElse(null);
        if (preset == null || !preset.getUser().getId().equals(user.getId())) {
            return ResponseEntity.status(403).body(Map.of("message", "Nemáte prístup k tomuto preset"));
        }

        if (request.getName() != null && !request.getName().isBlank()) {
            preset.setName(request.getName().trim());
        }
        if (request.getExercises() != null) {
            preset.setExercises(request.getExercises());
        }

        presetRepo.save(preset);
        return ResponseEntity.ok(toDtoFull(preset));
    }

    // DELETE /api/workout-presets/{id}
    @DeleteMapping("/{id}")
    public ResponseEntity<?> delete(@PathVariable UUID id,
                                    @AuthenticationPrincipal UserDetails ud) {
        User user = resolve(ud);
        if (user == null) return ResponseEntity.status(401).build();

        WorkoutPreset preset = presetRepo.findById(id).orElse(null);
        if (preset == null || !preset.getUser().getId().equals(user.getId())) {
            return ResponseEntity.status(403).body(Map.of("message", "Nemáte prístup k tomuto preset"));
        }

        presetRepo.delete(preset);
        return ResponseEntity.ok(Map.of("message", "Preset bol úspešne zmazaný"));
    }

    // POST /api/workout-presets/{id}/use — označ použitie + aktualizuj cviky
    @PostMapping("/{id}/use")
    public ResponseEntity<?> markUsed(@PathVariable UUID id,
                                      @RequestBody(required = false) WorkoutPresetRequest request,
                                      @AuthenticationPrincipal UserDetails ud) {
        User user = resolve(ud);
        if (user == null) return ResponseEntity.status(401).build();

        WorkoutPreset preset = presetRepo.findById(id).orElse(null);
        if (preset == null || !preset.getUser().getId().equals(user.getId())) {
            return ResponseEntity.status(403).body(Map.of("message", "Nemáte prístup k tomuto preset"));
        }

        preset.setLastUsedAt(LocalDateTime.now());
        preset.setUseCount(preset.getUseCount() == null ? 1 : preset.getUseCount() + 1);

        // Aktualizuj cviky ak boli poslané
        if (request != null && request.getExercises() != null) {
            preset.setExercises(request.getExercises());
        }

        presetRepo.save(preset);
        return ResponseEntity.ok(toDtoFull(preset));
    }

    // ── helpers ──
    private User resolve(UserDetails ud) {
        if (ud == null) return null;
        return userRepo.findByEmail(ud.getUsername()).orElse(null);
    }

    private Map<String, Object> toDtoLight(WorkoutPreset p, boolean isSharedFromTrainer) {
        Map<String, Object> dto = new LinkedHashMap<>();
        dto.put("id", p.getId().toString());
        dto.put("name", p.getName());
        dto.put("useCount", p.getUseCount());
        dto.put("lastUsedAt", p.getLastUsedAt());
        dto.put("createdAt", p.getCreatedAt());
        dto.put("exerciseCount", p.getExercises() != null ? p.getExercises().size() : 0);
        dto.put("fromTrainer", isSharedFromTrainer);
        return dto;
    }

    private Map<String, Object> toDtoFull(WorkoutPreset p) {
        Map<String, Object> dto = new LinkedHashMap<>();
        dto.put("id", p.getId().toString());
        dto.put("name", p.getName());
        dto.put("useCount", p.getUseCount());
        dto.put("lastUsedAt", p.getLastUsedAt());
        dto.put("createdAt", p.getCreatedAt());
        dto.put("exercises", p.getExercises() != null ? p.getExercises() : List.of());
        return dto;
    }
}