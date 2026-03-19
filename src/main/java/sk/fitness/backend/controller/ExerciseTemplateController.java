package sk.fitness.backend.controller;

import sk.fitness.backend.model.ExerciseTemplate;
import sk.fitness.backend.model.User;
import sk.fitness.backend.repository.ExerciseTemplateRepository;
import sk.fitness.backend.repository.UserRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.*;

@RestController
@RequestMapping("/api/exercise-templates")
public class ExerciseTemplateController {

    private final ExerciseTemplateRepository repo;
    private final UserRepository userRepo;

    public ExerciseTemplateController(ExerciseTemplateRepository repo, UserRepository userRepo) {
        this.repo = repo;
        this.userRepo = userRepo;
    }

    // GET /api/exercise-templates?q=bench — vyhľadávanie / všetky
    @GetMapping
    public ResponseEntity<?> getTemplates(
            @RequestParam(required = false) String q,
            @AuthenticationPrincipal UserDetails ud) {
        User user = resolve(ud);
        if (user == null) return ResponseEntity.status(401).build();

        List<ExerciseTemplate> results = (q != null && !q.isBlank())
                ? repo.searchByName(user.getId(), q)
                : repo.findByUserIdOrderByUseCountDescLastUsedAtDesc(user.getId());

        return ResponseEntity.ok(results.stream().map(this::toDto).toList());
    }

    // POST /api/exercise-templates — vytvor alebo aktualizuj
    @PostMapping
    public ResponseEntity<?> saveTemplate(
            @RequestBody Map<String, Object> body,
            @AuthenticationPrincipal UserDetails ud) {
        User user = resolve(ud);
        if (user == null) return ResponseEntity.status(401).build();

        String name = (String) body.get("name");
        if (name == null || name.isBlank())
            return ResponseEntity.badRequest().body(Map.of("message", "Chýba názov"));

        // Ak cvik už existuje — aktualizuj useCount
        ExerciseTemplate template = repo.findByUserIdAndNameIgnoreCase(user.getId(), name.trim())
                .orElse(null);

        if (template == null) {
            template = new ExerciseTemplate();
            template.setUser(user);
            template.setName(name.trim());
            template.setUseCount(1);
        } else {
            template.setUseCount(template.getUseCount() + 1);
        }

        template.setCategory((String) body.getOrDefault("category", "sila"));
        template.setTrackType((String) body.getOrDefault("trackType", "weight_reps"));
        template.setCustomLabels((String) body.get("customLabels"));
        template.setLastUsedAt(LocalDateTime.now());
        repo.save(template);

        return ResponseEntity.ok(toDto(template));
    }

    // PUT /api/exercise-templates/{id} — zmeň trackType/labels
    @PutMapping("/{id}")
    public ResponseEntity<?> updateTemplate(
            @PathVariable String id,
            @RequestBody Map<String, Object> body,
            @AuthenticationPrincipal UserDetails ud) {
        User user = resolve(ud);
        if (user == null) return ResponseEntity.status(401).build();

        ExerciseTemplate t = repo.findById(UUID.fromString(id)).orElse(null);
        if (t == null) return ResponseEntity.notFound().build();
        if (!t.getUser().getId().equals(user.getId())) return ResponseEntity.status(403).build();

        if (body.containsKey("trackType")) t.setTrackType((String) body.get("trackType"));
        if (body.containsKey("customLabels")) t.setCustomLabels((String) body.get("customLabels"));
        if (body.containsKey("category")) t.setCategory((String) body.get("category"));
        repo.save(t);

        return ResponseEntity.ok(toDto(t));
    }

    // DELETE /api/exercise-templates/{id}
    @DeleteMapping("/{id}")
    public ResponseEntity<?> deleteTemplate(
            @PathVariable String id,
            @AuthenticationPrincipal UserDetails ud) {
        User user = resolve(ud);
        if (user == null) return ResponseEntity.status(401).build();

        ExerciseTemplate t = repo.findById(UUID.fromString(id)).orElse(null);
        if (t == null) return ResponseEntity.notFound().build();
        if (!t.getUser().getId().equals(user.getId())) return ResponseEntity.status(403).build();

        repo.delete(t);
        return ResponseEntity.ok(Map.of("message", "Zmazané"));
    }

    private User resolve(UserDetails ud) {
        if (ud == null) return null;
        return userRepo.findByEmail(ud.getUsername()).orElse(null);
    }

    private Map<String, Object> toDto(ExerciseTemplate t) {
        Map<String, Object> m = new HashMap<>();
        m.put("id", t.getId().toString());
        m.put("name", t.getName());
        m.put("category", t.getCategory());
        m.put("trackType", t.getTrackType());
        m.put("customLabels", t.getCustomLabels());
        m.put("useCount", t.getUseCount());
        m.put("lastUsedAt", t.getLastUsedAt() != null ? t.getLastUsedAt().toString() : null);
        return m;
    }
}