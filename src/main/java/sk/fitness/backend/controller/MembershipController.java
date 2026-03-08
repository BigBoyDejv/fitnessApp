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
import java.time.YearMonth;
import java.util.*;

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
    @GetMapping("/types")
    public ResponseEntity<List<MembershipType>> getTypes() {
        return ResponseEntity.ok(membershipTypeRepository.findByIsActiveTrue());
    }

    // ── GET /api/memberships/my ───────────────────────────────────────────────
    @GetMapping("/my")
    public ResponseEntity<?> getMyMembership(@AuthenticationPrincipal UserDetails ud) {
        User user = resolveUser(ud);
        if (user == null) return ResponseEntity.status(401).build();

        return membershipRepository
                .findByUserIdAndStatus(user.getId(), Membership.MembershipStatus.active)
                .map(m -> ResponseEntity.ok(toResponse(m)))
                .orElse(ResponseEntity.notFound().build());
    }

    // ── GET /api/memberships/my/history ──────────────────────────────────────
    @GetMapping("/my/history")
    public ResponseEntity<?> getMyHistory(@AuthenticationPrincipal UserDetails ud) {
        User user = resolveUser(ud);
        if (user == null) return ResponseEntity.status(401).build();

        List<Map<String, Object>> history = membershipRepository
                .findByUserIdOrderByCreatedAtDesc(user.getId())
                .stream().map(this::toResponse).toList();
        return ResponseEntity.ok(history);
    }

    // ── POST /api/memberships/purchase ────────────────────────────────────────
    @PostMapping("/purchase")
    public ResponseEntity<?> purchase(
            @RequestBody Map<String, Integer> body,
            @AuthenticationPrincipal UserDetails ud) {

        User user = resolveUser(ud);
        if (user == null) return ResponseEntity.status(401).build();

        Integer typeId = body.get("membershipTypeId");
        if (typeId == null)
            return ResponseEntity.badRequest().body(Map.of("message", "Chýba membershipTypeId"));

        MembershipType type = membershipTypeRepository.findById(typeId)
                .orElseThrow(() -> new RuntimeException("Typ členstva nenájdený"));

        // Zruš existujúce aktívne
        membershipRepository
                .findByUserIdAndStatus(user.getId(), Membership.MembershipStatus.active)
                .ifPresent(old -> {
                    old.setStatus(Membership.MembershipStatus.cancelled);
                    membershipRepository.save(old);
                });

        Membership m = new Membership();
        m.setUser(user);
        m.setMembershipType(type);
        m.setStartDate(LocalDate.now());
        m.setEndDate(LocalDate.now().plusDays(type.getDurationDays()));
        m.setStatus(Membership.MembershipStatus.active);
        membershipRepository.save(m);

        return ResponseEntity.ok(toResponse(m));
    }

    // ── GET /api/memberships/check ────────────────────────────────────────────
    // Overenie aktívneho členstva pred rezerváciou lekcie
    // Volá ho GymClassController pred book() — vracia 200 ak platné, 403 ak nie
    @GetMapping("/check")
    public ResponseEntity<?> checkMembership(@AuthenticationPrincipal UserDetails ud) {
        User user = resolveUser(ud);
        if (user == null) return ResponseEntity.status(401).build();

        Optional<Membership> opt = membershipRepository
                .findByUserIdAndStatus(user.getId(), Membership.MembershipStatus.active);

        if (opt.isEmpty() || !opt.get().isValid()) {
            return ResponseEntity.status(403).body(Map.of(
                    "hasActiveMembership", false,
                    "message", "Na rezerváciu lekcie potrebuješ aktívne členstvo."
            ));
        }

        Membership m = opt.get();
        return ResponseEntity.ok(Map.of(
                "hasActiveMembership", true,
                "membershipTypeName",  m.getMembershipType() != null ? m.getMembershipType().getName() : "—",
                "endDate",             m.getEndDate().toString(),
                "daysRemaining",       Math.max(0, LocalDate.now().until(m.getEndDate()).getDays())
        ));
    }

    // ── GET /api/admin/stats/memberships ──────────────────────────────────────
    // Admin štatistiky — počet aktívnych + breakdown podľa typu
    // Poznámka: endpoint je v /api/memberships/stats/memberships ale admin.html
    // volá /api/admin/stats/memberships — preto sú oba mapované
    @GetMapping("/stats/memberships")
    public ResponseEntity<?> membershipStats(@AuthenticationPrincipal UserDetails ud) {
        if (!isAdmin(ud)) return ResponseEntity.status(403).build();
        return ResponseEntity.ok(buildMembershipStats());
    }

    // ── GET /api/admin/stats/revenue ──────────────────────────────────────────
    // Admin štatistiky — obrat za posledných 8 mesiacov
    @GetMapping("/stats/revenue")
    public ResponseEntity<?> revenueStats(@AuthenticationPrincipal UserDetails ud) {
        if (!isAdmin(ud)) return ResponseEntity.status(403).build();

        YearMonth now = YearMonth.now();
        List<Map<String, Object>> monthly = new ArrayList<>();

        for (int i = 7; i >= 0; i--) {
            YearMonth ym = now.minusMonths(i);
            List<Membership> memberships = membershipRepository
                    .findByStartMonth(ym.getYear(), ym.getMonthValue());

            double total = memberships.stream()
                    .mapToDouble(m -> m.getMembershipType() != null
                            ? m.getMembershipType().getPriceEuros() : 0.0)
                    .sum();

            Map<String, Object> entry = new HashMap<>();
            entry.put("year",  ym.getYear());
            entry.put("month", ym.getMonthValue());
            entry.put("label", ym.getMonth().getDisplayName(
                    java.time.format.TextStyle.SHORT,
                    new java.util.Locale("sk", "SK")));
            entry.put("total", Math.round(total * 100.0) / 100.0);
            entry.put("count", memberships.size());
            monthly.add(entry);
        }

        double currentMonth = monthly.isEmpty() ? 0 :
                (double) monthly.get(monthly.size() - 1).get("total");
        double lastMonth = monthly.size() < 2 ? 0 :
                (double) monthly.get(monthly.size() - 2).get("total");

        Map<String, Object> result = new HashMap<>();
        result.put("currentMonth", currentMonth);
        result.put("lastMonth",    lastMonth);
        result.put("monthly",      monthly);
        return ResponseEntity.ok(result);
    }

    // ── Pomocné metódy ────────────────────────────────────────────────────────

    private Map<String, Object> buildMembershipStats() {
        LocalDate today = LocalDate.now();
        List<Membership> active = membershipRepository.findAllActiveAndValid(today);
        List<Object[]> byType  = membershipRepository.countActiveByType(today);

        List<Map<String, Object>> typeBreakdown = new ArrayList<>();
        for (Object[] row : byType) {
            Map<String, Object> t = new HashMap<>();
            t.put("name",  row[0] != null ? row[0].toString() : "—");
            t.put("count", ((Number) row[1]).intValue());
            typeBreakdown.add(t);
        }

        Map<String, Object> result = new HashMap<>();
        result.put("totalActive", active.size());
        result.put("byType",      typeBreakdown);
        return result;
    }

    private User resolveUser(UserDetails ud) {
        if (ud == null) return null;
        return userRepository.findByEmail(ud.getUsername()).orElse(null);
    }

    private boolean isAdmin(UserDetails ud) {
        if (ud == null) return false;
        User u = userRepository.findByEmail(ud.getUsername()).orElse(null);
        return u != null && "admin".equalsIgnoreCase(u.getRole());
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