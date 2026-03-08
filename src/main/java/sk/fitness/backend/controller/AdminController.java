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
import java.util.*;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/admin")
public class AdminController {

    private final UserRepository userRepository;
    private final MembershipRepository membershipRepository;
    private final MembershipTypeRepository membershipTypeRepository;

    public AdminController(UserRepository userRepository,
                           MembershipRepository membershipRepository,
                           MembershipTypeRepository membershipTypeRepository) {
        this.userRepository = userRepository;
        this.membershipRepository = membershipRepository;
        this.membershipTypeRepository = membershipTypeRepository;
    }


    @GetMapping("/profiles")
    public ResponseEntity<?> getAllUsers(@AuthenticationPrincipal UserDetails ud) {
        if (!isAdmin(ud)) return ResponseEntity.status(403).build();
        List<Map<String, Object>> users = userRepository.findAll()
                .stream().map(this::userDto).collect(Collectors.toList());
        return ResponseEntity.ok(users);
    }


    @PutMapping("/profiles/{id}/status")
    public ResponseEntity<?> setUserStatus(
            @PathVariable String id,
            @RequestBody Map<String, Boolean> body,
            @AuthenticationPrincipal UserDetails ud) {
        if (!isAdmin(ud)) return ResponseEntity.status(403).build();
        User user = userRepository.findByIdEquals(UUID.fromString(id)).orElse(null);
        if (user == null) return ResponseEntity.notFound().build();
        Boolean active = body.get("active");
        if (active == null) return ResponseEntity.badRequest().body(Map.of("message", "Chýba pole 'active'"));
        user.setIsActive(active);
        userRepository.save(user);
        return ResponseEntity.ok(userDto(user));
    }


    @GetMapping("/memberships/user/{userId}")
    public ResponseEntity<?> getUserMembership(
            @PathVariable String userId,
            @AuthenticationPrincipal UserDetails ud) {
        if (!isAdmin(ud)) return ResponseEntity.status(403).build();
        return membershipRepository
                .findByUserIdAndStatus(UUID.fromString(userId), Membership.MembershipStatus.active)
                .map(m -> ResponseEntity.ok(membershipDto(m)))
                .<ResponseEntity<?>>map(r -> r)
                .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping("/memberships/assign")
    public ResponseEntity<?> assignMembership(
            @RequestBody Map<String, Object> body,
            @AuthenticationPrincipal UserDetails ud) {
        if (!isAdmin(ud)) return ResponseEntity.status(403).build();

        String userId = (String) body.get("userId");
        Integer typeId = (Integer) body.get("membershipTypeId");
        String startDateStr = (String) body.get("startDate");

        if (userId == null || typeId == null)
            return ResponseEntity.badRequest().body(Map.of("message", "Chýba userId alebo membershipTypeId"));

        User user = userRepository.findByIdEquals(UUID.fromString(userId)).orElse(null);
        if (user == null) return ResponseEntity.badRequest().body(Map.of("message", "Užívateľ nenájdený"));

        MembershipType type = membershipTypeRepository.findById(typeId).orElse(null);
        if (type == null) return ResponseEntity.badRequest().body(Map.of("message", "Typ členstva nenájdený"));


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



    private boolean isAdmin(UserDetails ud) {
        if (ud == null) return false;
        User caller = userRepository.findByEmail(ud.getUsername()).orElse(null);
        return caller != null && "admin".equalsIgnoreCase(caller.getRole());
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