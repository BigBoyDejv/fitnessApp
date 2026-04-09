package sk.fitness.backend.controller;

import sk.fitness.backend.model.Membership;
import sk.fitness.backend.model.MembershipType;
import sk.fitness.backend.model.Product;
import sk.fitness.backend.model.User;
import sk.fitness.backend.model.Notification;
import sk.fitness.backend.repository.MembershipRepository;
import sk.fitness.backend.repository.MembershipTypeRepository;
import sk.fitness.backend.repository.ProductRepository;
import sk.fitness.backend.repository.UserRepository;
import sk.fitness.backend.repository.NotificationRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.*;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/admin")
public class AdminController {

    private final UserRepository userRepository;
    private final MembershipRepository membershipRepository;
    private final MembershipTypeRepository membershipTypeRepository;
    private final ProductRepository productRepository;
    private final NotificationRepository notificationRepository;

    public AdminController(UserRepository userRepository,
                           MembershipRepository membershipRepository,
                           MembershipTypeRepository membershipTypeRepository,
                           ProductRepository productRepository,
                           NotificationRepository notificationRepository) {
        this.userRepository = userRepository;
        this.membershipRepository = membershipRepository;
        this.membershipTypeRepository = membershipTypeRepository;
        this.productRepository = productRepository;
        this.notificationRepository = notificationRepository;
    }

    // ── GET /api/admin/users ── zoznam všetkých užívateľov ───────────────────
    @GetMapping("/profiles")
    public ResponseEntity<?> getAllUsers(@AuthenticationPrincipal UserDetails ud) {
        if (!isAdminOrReception(ud)) return ResponseEntity.status(403).build();
        List<Map<String, Object>> users = userRepository.findAll()
                .stream().map(this::userDto).collect(Collectors.toList());
        return ResponseEntity.ok(users);
    }

    // ── PUT /api/admin/users/{id}/status ── aktivovať / deaktivovať ──────────
    @PutMapping("/profiles/{id}/status")
    public ResponseEntity<?> setUserStatus(
            @PathVariable String id,
            @RequestBody Map<String, Boolean> body,
            @AuthenticationPrincipal UserDetails ud) {
        if (!isAdminOrReception(ud)) return ResponseEntity.status(403).build();
        User user = userRepository.findByIdEquals(UUID.fromString(id)).orElse(null);
        if (user == null) return ResponseEntity.notFound().build();
        Boolean active = body.get("active");
        if (active == null) return ResponseEntity.badRequest().body(Map.of("message", "Chýba pole 'active'"));
        user.setIsActive(active);
        userRepository.save(user);
        return ResponseEntity.ok(userDto(user));
    }

    // ── GET /api/admin/memberships/user/{userId} ── členstvo konkrétneho člena
    @GetMapping("/memberships/user/{userId}")
    public ResponseEntity<?> getUserMembership(
            @PathVariable String userId,
            @AuthenticationPrincipal UserDetails ud) {
        if (!isAdminOrReception(ud)) return ResponseEntity.status(403).build();
        return membershipRepository
                .findByUserIdAndStatus(UUID.fromString(userId), Membership.MembershipStatus.active)
                .map(m -> ResponseEntity.ok(membershipDto(m)))
                .<ResponseEntity<?>>map(r -> r)
                .orElse(ResponseEntity.notFound().build());
    }

    // ── POST /api/admin/memberships/assign ── priradiť / obnoviť predplatné ──
    // Body: { userId, membershipTypeId, startDate (optional) }
    @PostMapping("/memberships/assign")
    public ResponseEntity<?> assignMembership(
            @RequestBody Map<String, Object> body,
            @AuthenticationPrincipal UserDetails ud) {
        if (!isAdminOrReception(ud)) return ResponseEntity.status(403).build();

        String userId = (String) body.get("userId");
        Integer typeId = (Integer) body.get("membershipTypeId");
        String startDateStr = (String) body.get("startDate");

        if (userId == null || typeId == null)
            return ResponseEntity.badRequest().body(Map.of("message", "Chýba userId alebo membershipTypeId"));

        User user = userRepository.findByIdEquals(UUID.fromString(userId)).orElse(null);
        if (user == null) return ResponseEntity.badRequest().body(Map.of("message", "Užívateľ nenájdený"));

        MembershipType type = membershipTypeRepository.findById(typeId).orElse(null);
        if (type == null) return ResponseEntity.badRequest().body(Map.of("message", "Typ členstva nenájdený"));

        // Zruš existujúce aktívne členstvo
        membershipRepository.findByUserIdAndStatus(user.getId(), Membership.MembershipStatus.active)
                .ifPresent(old -> {
                    old.setStatus(Membership.MembershipStatus.cancelled);
                    membershipRepository.save(old);
                });

        LocalDate start = (startDateStr != null && !startDateStr.isBlank())
                ? LocalDate.parse(startDateStr)
                : LocalDate.now();

        Membership m = new Membership();
        m.setUser(user);
        m.setMembershipType(type);
        m.setStartDate(start);
        m.setEndDate(start.plusDays(type.getDurationDays()));
        m.setStatus(Membership.MembershipStatus.active);
        membershipRepository.save(m);

        return ResponseEntity.ok(membershipDto(m));
    }
    // ── GET /api/admin/stats/inventory ────────────────────────────────────────
    @GetMapping("/inventory")
    public ResponseEntity<?> inventoryStatus(@AuthenticationPrincipal UserDetails ud) {
        if (!isAdmin(ud)) return ResponseEntity.status(403).build();

        List<Product> all = productRepository.findAll();

        List<Map<String, Object>> items = all.stream()
                .filter(p -> Boolean.TRUE.equals(p.getActive()))
                .sorted(Comparator.comparingInt(Product::getStock))
                .map(p -> {
                    Map<String, Object> m = new LinkedHashMap<>();
                    m.put("id",       p.getId());
                    m.put("name",     p.getName());
                    m.put("category", p.getCategory());
                    m.put("stock",    p.getStock());
                    m.put("price",    p.getPriceCents() / 100.0);
                    m.put("value",    p.getStock() * p.getPriceCents() / 100.0);
                    m.put("status",   p.getStock() == 0 ? "out" : p.getStock() < 10 ? "low" : "ok");
                    return m;
                })
                .toList();

        int totalProducts = items.size();
        long outOfStock   = items.stream().filter(i -> "out".equals(i.get("status"))).count();
        long lowStock     = items.stream().filter(i -> "low".equals(i.get("status"))).count();
        double totalValue = items.stream().mapToDouble(i -> (double) i.get("value")).sum();

        return ResponseEntity.ok(Map.of(
                "items",        items,
                "totalProducts", totalProducts,
                "outOfStock",   outOfStock,
                "lowStock",     lowStock,
                "totalValue",   Math.round(totalValue * 100.0) / 100.0
        ));
    }

    @PutMapping("/memberships/cancel/{userId}")
    public ResponseEntity<?> cancelMembership(
            @PathVariable String userId,
            @AuthenticationPrincipal UserDetails ud) {
        if (!isAdmin(ud)) return ResponseEntity.status(403).build();

        Optional<Membership> opt = membershipRepository
                .findByUserIdAndStatus(UUID.fromString(userId), Membership.MembershipStatus.active);

        if (opt.isEmpty()) return ResponseEntity.badRequest().body(Map.of("message", "Žiadne aktívne predplatné"));

        Membership m = opt.get();
        m.setStatus(Membership.MembershipStatus.cancelled);
        membershipRepository.save(m);
        return ResponseEntity.ok(Map.of("message", "Predplatné zrušené", "userId", userId));
    }

    @GetMapping("/plans-management")
    public ResponseEntity<?> getAllMembershipTypes(@AuthenticationPrincipal UserDetails ud) {
        if (ud == null) return ResponseEntity.status(401).build();
        try {
            // Check admin role directly from UserDetails if possible, 
            // but for now we keep the safety check
            if (!isAdmin(ud)) return ResponseEntity.status(403).build();
            
            return ResponseEntity.ok(membershipTypeRepository.findAll());
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(500).body(Map.of("message", "Chyba na serveri: " + e.getMessage()));
        }
    }

    // ── POST /api/admin/plans-management ── vytvoriť nový typ členstva ────────
    @PostMapping("/plans-management")
    public ResponseEntity<?> createMembershipType(
            @RequestBody Map<String, Object> body,
            @AuthenticationPrincipal UserDetails ud) {
        if (!isAdmin(ud)) return ResponseEntity.status(403).build();

        try {
            MembershipType type = new MembershipType();
            
            if (body.get("name") == null) return ResponseEntity.badRequest().body(Map.of("message", "Názov je povinný"));
            type.setName(body.get("name").toString());
            
            type.setDescription(body.get("description") != null ? body.get("description").toString() : "");
            
            if (body.get("priceEuros") == null) return ResponseEntity.badRequest().body(Map.of("message", "Cena je povinná"));
            double priceEuros = Double.parseDouble(body.get("priceEuros").toString());
            type.setPriceCents((int) Math.round(priceEuros * 100));
            
            if (body.get("durationDays") == null) return ResponseEntity.badRequest().body(Map.of("message", "Trvanie je povinné"));
            type.setDurationDays(Integer.parseInt(body.get("durationDays").toString()));
            
            type.setActive(true);
            membershipTypeRepository.save(type);
            return ResponseEntity.ok(type);
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(500).body(Map.of("message", "Chyba pri vytváraní: " + e.getMessage()));
        }
    }

    // ── PUT /api/admin/plans-management/{id} ── editovať typ členstva ─────────
    @PutMapping("/plans-management/{id}")
    public ResponseEntity<?> updateMembershipType(
            @PathVariable Integer id,
            @RequestBody Map<String, Object> body,
            @AuthenticationPrincipal UserDetails ud) {
        if (!isAdmin(ud)) return ResponseEntity.status(403).build();

        try {
            MembershipType type = membershipTypeRepository.findById(id).orElse(null);
            if (type == null) return ResponseEntity.notFound().build();

            if (body.containsKey("name") && body.get("name") != null) 
                type.setName(body.get("name").toString());
            
            if (body.containsKey("description")) 
                type.setDescription(body.get("description") != null ? body.get("description").toString() : "");

            if (body.containsKey("priceEuros") && body.get("priceEuros") != null) {
                double priceEuros = Double.parseDouble(body.get("priceEuros").toString());
                int newPriceCents = (int) Math.round(priceEuros * 100);
                
                // Check if price changed
                if (type.getPriceCents() == null || type.getPriceCents() != newPriceCents) {
                    double oldPriceEuros = type.getPriceEuros();
                    type.setPriceCents(newPriceCents);
                    
                    // Notify all users about price change
                    List<User> allUsers = userRepository.findAll();
                    List<Notification> notifications = new ArrayList<>();
                    for (User u : allUsers) {
                        if (Boolean.TRUE.equals(u.getIsActive())) {
                            Notification n = new Notification();
                            n.setUser(u);
                            n.setType("admin_message");
                            n.setTitle("Zmena cenníka");
                            n.setMessage(String.format("Cena balíka '%s' bola zmenená z %.2f € na %.2f €.", 
                                    type.getName(), oldPriceEuros, priceEuros));
                            n.setSeverity("info");
                            notifications.add(n);
                        }
                    }
                    notificationRepository.saveAll(notifications);
                }
            }

            if (body.containsKey("durationDays") && body.get("durationDays") != null) {
                type.setDurationDays(Integer.parseInt(body.get("durationDays").toString()));
            }

            if (body.containsKey("active") && body.get("active") != null) {
                type.setActive(Boolean.parseBoolean(body.get("active").toString()));
            }

            membershipTypeRepository.save(type);
            return ResponseEntity.ok(type);
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(500).body(Map.of("message", "Chyba pri aktualizácii: " + e.getMessage()));
        }
    }

    // ── Pomocné ───────────────────────────────────────────────────────────────

    private boolean isAdmin(UserDetails ud) {
        if (ud == null) return false;
        User caller = userRepository.findByEmail(ud.getUsername()).orElse(null);
        return caller != null && "admin".equalsIgnoreCase(caller.getRole());
    }

    private boolean isAdminOrReception(UserDetails ud) {
        if (ud == null) return false;
        User caller = userRepository.findByEmail(ud.getUsername()).orElse(null);
        if (caller == null) return false;
        return "admin".equalsIgnoreCase(caller.getRole()) || "reception".equalsIgnoreCase(caller.getRole());
    }

    private Map<String, Object> userDto(User u) {
        Map<String, Object> m = new HashMap<>();
        m.put("id",             u.getId().toString());
        m.put("email",          u.getEmail());
        m.put("fullName",       u.getFullName());
        m.put("phone",          u.getPhone());
        m.put("role",           u.getRole());
        m.put("active",         Boolean.TRUE.equals(u.getIsActive()));
        m.put("specialization", u.getSpecialization());
        m.put("avatarUrl",      u.getAvatarUrl());  // ← TOTO CHÝBA, PRIDAJ
        m.put("createdAt",      u.getCreatedAt() != null ? u.getCreatedAt().toString() : null);
        return m;
    }

    private Map<String, Object> membershipDto(Membership m) {
        long daysLeft = LocalDate.now().until(m.getEndDate()).getDays();
        Map<String, Object> dto = new HashMap<>();
        dto.put("id",                 m.getId().toString());
        dto.put("membershipTypeName", m.getMembershipType() != null ? m.getMembershipType().getName() : "—");
        dto.put("priceEuros",         m.getMembershipType() != null ? m.getMembershipType().getPriceEuros() : 0.0);
        dto.put("startDate",          m.getStartDate().toString());
        dto.put("endDate",            m.getEndDate().toString());
        dto.put("status",             m.getStatus().name());
        dto.put("daysRemaining",      Math.max(0, daysLeft));
        return dto;
    }
}