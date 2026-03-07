package sk.fitness.backend.controller;

import sk.fitness.backend.model.Membership;
import sk.fitness.backend.model.MembershipType;
import sk.fitness.backend.model.User;
import sk.fitness.backend.repository.MembershipRepository;
import sk.fitness.backend.repository.MembershipTypeRepository;
import sk.fitness.backend.repository.UserRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/memberships")
public class MembershipController {

    private final MembershipRepository membershipRepository;
    private final MembershipTypeRepository membershipTypeRepository;
    private final UserRepository userRepository;

    public MembershipController(MembershipRepository membershipRepository,
                                MembershipTypeRepository membershipTypeRepository,
                                UserRepository userRepository) {
        this.membershipRepository = membershipRepository;
        this.membershipTypeRepository = membershipTypeRepository;
        this.userRepository = userRepository;
    }

    // ── GET /api/memberships/types ────────────────────────────────────────────
    // Všetky dostupné typy členstva (cenník)
    @GetMapping("/types")
    public ResponseEntity<List<MembershipType>> getTypes() {
        return ResponseEntity.ok(membershipTypeRepository.findByIsActiveTrue());
    }

    // ── GET /api/memberships/my ───────────────────────────────────────────────
    // Aktívne členstvo prihláseného používateľa
    @GetMapping("/my")
    public ResponseEntity<?> getMyMembership(
            @AuthenticationPrincipal UserDetails userDetails) {

        User user = resolveUser(userDetails);
        if (user == null) return ResponseEntity.status(401).build();

        return membershipRepository
                .findByUserIdAndStatus(user.getId(), Membership.MembershipStatus.active)
                .map(m -> ResponseEntity.ok(toResponse(m)))
                .orElse(ResponseEntity.notFound().build());
    }

    // ── GET /api/memberships/my/history ──────────────────────────────────────
    // Celá história členstviev prihláseného používateľa
    @GetMapping("/my/history")
    public ResponseEntity<?> getMyHistory(
            @AuthenticationPrincipal UserDetails userDetails) {

        User user = resolveUser(userDetails);
        if (user == null) return ResponseEntity.status(401).build();

        List<Map<String, Object>> history = membershipRepository
                .findByUserIdOrderByCreatedAtDesc(user.getId())
                .stream()
                .map(this::toResponse)
                .toList();

        return ResponseEntity.ok(history);
    }

    // ── POST /api/memberships/purchase ───────────────────────────────────────
    // Kúp / obnov členstvo (mock platba — bez Stripe)
    @PostMapping("/purchase")
    public ResponseEntity<?> purchase(
            @RequestBody Map<String, Integer> body,
            @AuthenticationPrincipal UserDetails userDetails) {

        User user = resolveUser(userDetails);
        if (user == null) return ResponseEntity.status(401).build();

        Integer typeId = body.get("membershipTypeId");
        if (typeId == null) {
            return ResponseEntity.badRequest().body("Chýba membershipTypeId");
        }

        MembershipType type = membershipTypeRepository.findById(typeId)
                .orElseThrow(() -> new RuntimeException("Typ členstva nenájdený"));

        // Zruš existujúce aktívne členstvo
        membershipRepository
                .findByUserIdAndStatus(user.getId(), Membership.MembershipStatus.active)
                .ifPresent(old -> {
                    old.setStatus(Membership.MembershipStatus.cancelled);
                    membershipRepository.save(old);
                });

        // Vytvor nové
        Membership membership = new Membership();
        membership.setUser(user);
        membership.setMembershipType(type);
        membership.setStartDate(LocalDate.now());
        membership.setEndDate(LocalDate.now().plusDays(type.getDurationDays()));
        membership.setStatus(Membership.MembershipStatus.active);

        membershipRepository.save(membership);
        return ResponseEntity.ok(toResponse(membership));
    }

    // ── Pomocné metódy ────────────────────────────────────────────────────────

    private User resolveUser(UserDetails userDetails) {
        if (userDetails == null) return null;
        return userRepository.findByEmail(userDetails.getUsername()).orElse(null);
    }

    private Map<String, Object> toResponse(Membership m) {
        long daysLeft = LocalDate.now().until(m.getEndDate()).getDays();
        return Map.of(
                "id",                 m.getId().toString(),
                "membershipTypeName", m.getMembershipType() != null ? m.getMembershipType().getName() : "—",
                "priceEuros",         m.getMembershipType() != null ? m.getMembershipType().getPriceEuros() : 0.0,
                "startDate",          m.getStartDate().toString(),
                "endDate",            m.getEndDate().toString(),
                "status",             m.getStatus().name(),
                "isValid",            m.isValid(),
                "daysRemaining",      Math.max(0, daysLeft)
        );
    }
}
