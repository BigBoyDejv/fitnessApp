package sk.fitness.backend.controller;

import sk.fitness.backend.model.User;
import sk.fitness.backend.repository.UserRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/users")
public class UserController {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    public UserController(UserRepository userRepository, PasswordEncoder passwordEncoder) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
    }

    // ── GET /api/users/{id} ───────────────────────────────────────────────────
    @GetMapping("/{id}")
    public ResponseEntity<?> getUser(
            @PathVariable String id,
            @AuthenticationPrincipal UserDetails userDetails) {

        User caller = resolveUser(userDetails);
        if (caller == null) return ResponseEntity.status(401).build();

        UUID uid = UUID.fromString(id);

        if (!caller.getId().equals(uid) && !caller.getRole().equalsIgnoreCase("admin")) {
            return ResponseEntity.status(403).body(Map.of("message", "Nemáš oprávnenie"));
        }

        return userRepository.findByIdEquals(uid)
                .map(u -> (ResponseEntity<?>) ResponseEntity.ok(toDto(u)))
                .orElse(ResponseEntity.notFound().build());
    }

    // ── PUT /api/users/{id} ───────────────────────────────────────────────────
    // Mení: fullName, phone, avatarUrl, specialization
    // Admin môže navyše meniť: role
    @PutMapping("/{id}")
    public ResponseEntity<?> updateUser(
            @PathVariable String id,
            @RequestBody Map<String, String> body,
            @AuthenticationPrincipal UserDetails userDetails) {

        User caller = resolveUser(userDetails);
        if (caller == null) return ResponseEntity.status(401).build();

        UUID uid = UUID.fromString(id);
        boolean isAdmin = caller.getRole().equalsIgnoreCase("admin");

        if (!caller.getId().equals(uid) && !isAdmin) {
            return ResponseEntity.status(403).body(Map.of("message", "Nemáš oprávnenie meniť iný profil"));
        }

        User user = userRepository.findByIdEquals(uid).orElse(null);
        if (user == null) return ResponseEntity.notFound().build();

        if (body.containsKey("fullName") && notBlank(body.get("fullName"))) {
            user.setFullName(body.get("fullName").trim());
        }
        if (body.containsKey("phone")) {
            user.setPhone(body.get("phone") != null ? body.get("phone").trim() : null);
        }
        if (body.containsKey("avatarUrl")) {
            user.setAvatarUrl(body.get("avatarUrl") != null ? body.get("avatarUrl").trim() : null);
        }
        if (body.containsKey("specialization")) {
            user.setSpecialization(body.get("specialization") != null ? body.get("specialization").trim() : null);
        }
        // Len admin môže meniť rolu
        if (isAdmin && body.containsKey("role")) {
            String newRole = body.get("role");
            if (newRole != null && newRole.matches("member|trainer|admin|reception")) {
                user.setRole(newRole);
            }
        }

        User saved = userRepository.save(user);
        return ResponseEntity.ok(toDto(saved));
    }

    // ── PUT /api/users/{id}/password ──────────────────────────────────────────
    // Body: { currentPassword, newPassword }
    // Admin môže meniť heslo komukoľvek bez currentPassword
    @PutMapping("/{id}/password")
    public ResponseEntity<?> changePassword(
            @PathVariable String id,
            @RequestBody Map<String, String> body,
            @AuthenticationPrincipal UserDetails userDetails) {

        User caller = resolveUser(userDetails);
        if (caller == null) return ResponseEntity.status(401).build();

        UUID uid = UUID.fromString(id);
        boolean isAdmin = caller.getRole().equalsIgnoreCase("admin");

        if (!caller.getId().equals(uid) && !isAdmin) {
            return ResponseEntity.status(403).body(Map.of("message", "Nemáš oprávnenie"));
        }

        User user = userRepository.findByIdEquals(uid).orElse(null);
        if (user == null) return ResponseEntity.notFound().build();

        String newPassword = body.get("newPassword");
        if (newPassword == null || newPassword.length() < 6) {
            return ResponseEntity.badRequest().body(Map.of("message", "Nové heslo musí mať aspoň 6 znakov"));
        }

        // Bežný používateľ musí zadať aktuálne heslo
        if (!isAdmin) {
            String currentPassword = body.get("currentPassword");
            if (currentPassword == null || !passwordEncoder.matches(currentPassword, user.getPassword())) {
                return ResponseEntity.status(400).body(Map.of("message", "Aktuálne heslo je nesprávne"));
            }
        }

        user.setPassword(passwordEncoder.encode(newPassword));
        userRepository.save(user);

        return ResponseEntity.ok(Map.of("message", "Heslo úspešne zmenené"));
    }

    // ── Pomocné ───────────────────────────────────────────────────────────────

    private User resolveUser(UserDetails userDetails) {
        if (userDetails == null) return null;
        return userRepository.findByEmail(userDetails.getUsername()).orElse(null);
    }

    private boolean notBlank(String s) {
        return s != null && !s.isBlank();
    }

    private Map<String, Object> toDto(User u) {
        Map<String, Object> m = new HashMap<>();
        m.put("id",             u.getId().toString());
        m.put("email",          u.getEmail());
        m.put("fullName",       u.getFullName());
        m.put("phone",          u.getPhone());
        m.put("avatarUrl",      u.getAvatarUrl());
        m.put("role",           u.getRole());
        m.put("specialization", u.getSpecialization());
        m.put("active",         u.isActive());
        m.put("createdAt",      u.getCreatedAt() != null ? u.getCreatedAt().toString() : null);
        m.put("updatedAt",      u.getUpdatedAt() != null ? u.getUpdatedAt().toString() : null);
        return m;
    }
}
