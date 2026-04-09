package sk.fitness.backend.controller;

import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import sk.fitness.backend.dto.CreateGymClassRequest;
import sk.fitness.backend.dto.GymClassResponse;
import sk.fitness.backend.model.AttendanceStatus;
import sk.fitness.backend.model.ClassReservation;
import sk.fitness.backend.model.GymClass;
import sk.fitness.backend.model.Membership;
import sk.fitness.backend.model.Notification;
import sk.fitness.backend.model.User;
import sk.fitness.backend.repository.ClassReservationRepository;
import sk.fitness.backend.repository.GymClassRepository;
import sk.fitness.backend.repository.MembershipRepository;
import sk.fitness.backend.repository.NotificationRepository;
import sk.fitness.backend.repository.UserRepository;

import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/classes")
public class GymClassController {

    private final GymClassRepository gymClassRepository;
    private final UserRepository userRepository;
    private final MembershipRepository membershipRepository;
    private final ClassReservationRepository classReservationRepository;
    private final NotificationRepository notificationRepository;

    public GymClassController(GymClassRepository gymClassRepository,
                               UserRepository userRepository,
                               MembershipRepository membershipRepository,
                               ClassReservationRepository classReservationRepository,
                               NotificationRepository notificationRepository) {
        this.gymClassRepository = gymClassRepository;
        this.userRepository = userRepository;
        this.membershipRepository = membershipRepository;
        this.classReservationRepository = classReservationRepository;
        this.notificationRepository = notificationRepository;
    }

    // ── GET /api/classes ─────────────────────────────────────────────────────
    @Transactional(readOnly = true)
    @GetMapping
    public List<GymClassResponse> getClasses(
            @AuthenticationPrincipal UserDetails userDetails) {

        User currentUser = resolveUser(userDetails);
        boolean isAdminOrTrainer = currentUser != null &&
                (isAdmin(currentUser) || "trainer".equalsIgnoreCase(currentUser.getRole()));

        List<GymClass> classes;
        if (isAdminOrTrainer) {
            classes = gymClassRepository.findAll();
            classes.sort((a, b) -> a.getStartTime().compareTo(b.getStartTime()));
        } else {
            classes = gymClassRepository.findByStartTimeAfterOrderByStartTimeAsc(LocalDateTime.now());
        }

        return classes.stream()
                .map(gc -> mapToResponse(gc, currentUser))
                .toList();
    }

    // ── GET /api/classes/my ───────────────────────────────────────────────────
    @Transactional(readOnly = true)
    @GetMapping("/my")
    public ResponseEntity<List<GymClassResponse>> getMyClasses(
            @AuthenticationPrincipal UserDetails userDetails) {

        User currentUser = resolveUser(userDetails);
        if (currentUser == null) return ResponseEntity.status(401).build();

        List<GymClassResponse> myClasses = gymClassRepository
                .findMyClasses(currentUser)
                .stream()
                .map(gc -> mapToResponse(gc, currentUser))
                .toList();

        return ResponseEntity.ok(myClasses);
    }

    // ── GET /api/classes/{id} ─────────────────────────────────────────────────
    @Transactional(readOnly = true)
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
    @Transactional
    @PostMapping("/{id}/book")
    public ResponseEntity<?> book(
            @PathVariable Long id,
            @AuthenticationPrincipal UserDetails userDetails) {

        User currentUser = resolveUser(userDetails);
        if (currentUser == null) return ResponseEntity.status(401).body(Map.of("message", "Neprihlásený"));

        GymClass gymClass = gymClassRepository.findById(id).orElse(null);
        if (gymClass == null) return ResponseEntity.notFound().build();

        if (gymClass.getStartTime().isBefore(LocalDateTime.now())) {
            return ResponseEntity.badRequest().body(Map.of("message", "Nemožno si rezervovať lekciu, ktorá už začala."));
        }

        boolean hasMembership = membershipRepository
                .findByUserIdOrderByCreatedAtDesc(currentUser.getId())
                .stream()
                .anyMatch(m -> m.getStatus() == Membership.MembershipStatus.active && m.isValid());
        if (!hasMembership) return ResponseEntity.badRequest().body(Map.of("message", "Nemáš aktívne členstvo"));

        System.out.println("[BOOK] Attempting book for User=" + currentUser.getEmail() + " ClassId=" + gymClass.getId());
        java.util.List<ClassReservation> existingList = classReservationRepository.findAllByGymClassIdAndUserId(gymClass.getId(), currentUser.getId());
        
        if (!existingList.isEmpty()) {
            System.out.println("[BOOK] User " + currentUser.getId() + " ALREADY on list. Count: " + existingList.size());
            return ResponseEntity.ok(mapToResponse(gymClass, currentUser));
        }

        int currentBooked = (gymClass.getBooked() != null ? gymClass.getBooked() : 0);
        int maxCapacity = (gymClass.getCapacity() != null ? gymClass.getCapacity() : 0);

        if (currentBooked >= maxCapacity) {
            // Lekcia je plná – zapíšeme na čakačku
            ClassReservation res = new ClassReservation(gymClass, currentUser);
            res.setStatus(AttendanceStatus.WAITING);
            res.setReservedAt(LocalDateTime.now()); // Explicitne pre istotu dotazu
            
            res = classReservationRepository.saveAndFlush(res);
            
            // Synchronizácia kolekcie v pamäti (aby mapToResponse hneď videlo zmenu)
            gymClass.getReservations().add(res);
            gymClassRepository.saveAndFlush(gymClass);

            long pos = classReservationRepository.countWaitersBeforeTime(
                    gymClass.getId(), AttendanceStatus.WAITING, res.getReservedAt()) + 1;

            long totalWaiters = classReservationRepository.countByGymClassIdAndStatus(gymClass.getId(), AttendanceStatus.WAITING);

            System.out.println("[BOOKING] User " + currentUser.getEmail() + " on list for " + gymClass.getName() + " pos=" + pos);

            return ResponseEntity.ok(Map.of(
                    "message", "Ste zaradený na čakačku. Vaše poradie: " + pos + ".",
                    "status", "WAITING",
                    "isWaiting", true,
                    "waitlistPosition", pos,
                    "waitlistCount", totalWaiters
            ));
        }

        // Lekcia má voľné miesto – bežná rezervácia
        ClassReservation res = new ClassReservation(gymClass, currentUser);
        res.setStatus(AttendanceStatus.PENDING);
        classReservationRepository.saveAndFlush(res);
        
        // Synchronizácia kolekcie
        gymClass.getReservations().add(res);
        gymClass.setBooked(currentBooked + 1);
        gymClassRepository.saveAndFlush(gymClass);

        return ResponseEntity.ok(mapToResponse(gymClass, currentUser));
    }

    @PostMapping("/{id}/reserve")
    public ResponseEntity<?> reserve(@PathVariable Long id, @AuthenticationPrincipal UserDetails ud) {
        return book(id, ud);
    }

    // ── DELETE /api/classes/{id}/cancel ──────────────────────────────────────
    @Transactional
    @DeleteMapping("/{id}/cancel")
    public ResponseEntity<?> cancel(
            @PathVariable Long id,
            @AuthenticationPrincipal UserDetails userDetails) {

        User currentUser = resolveUser(userDetails);
        if (currentUser == null) return ResponseEntity.status(401).body(Map.of("message", "Neprihlásený"));

        GymClass gymClass = gymClassRepository.findById(id).orElse(null);
        if (gymClass == null) return ResponseEntity.notFound().build();

        if (gymClass.getStartTime().isBefore(LocalDateTime.now())) {
            return ResponseEntity.badRequest().body(Map.of("message", "Nemožno zrušiť lekciu, ktorá už začala."));
        }

        java.util.List<ClassReservation> allRes = classReservationRepository
                    .findAllByGymClassIdAndUserId(gymClass.getId(), currentUser.getId());
        if (allRes.isEmpty()) return ResponseEntity.badRequest().body(Map.of("message", "Nie si prihlásený na túto lekciu"));

        // Zisťujeme, či medzi ním bola aspoň jedna PENDING (v kapacite)
        boolean wasPending = allRes.stream().anyMatch(r -> r.getStatus() == AttendanceStatus.PENDING);
        
        // Zmažeme VŠETKY jeho rezervácie (aby sme vyčistili duplicity)
        classReservationRepository.deleteAll(allRes);
        classReservationRepository.flush(); 

        if (wasPending) {
            // Skúsime nájsť ďalšieho v rade
            Optional<ClassReservation> nextWaiter = classReservationRepository
                    .findFirstByGymClassAndStatusOrderByReservedAtAsc(gymClass, AttendanceStatus.WAITING);

            if (nextWaiter.isPresent()) {
                // Povýšime ho
                ClassReservation promoted = nextWaiter.get();
                promoted.setStatus(AttendanceStatus.PENDING);
                classReservationRepository.saveAndFlush(promoted);

                // Posielame notifikáciu
                Notification notif = new Notification();
                notif.setUser(promoted.getUser());
                notif.setType("class_booked");
                notif.setTitle("Uvoľnené miesto na lekcii!");
                notif.setMessage("Dostali ste sa z čakačky na lekciu \"" + gymClass.getName() + "\". Vaša rezervácia je teraz potvrdená.");
                notif.setSeverity("info");
                notificationRepository.save(notif);
            } else {
                // Nikto nečakal
                int booked = gymClass.getBooked() != null ? gymClass.getBooked() : 0;
                gymClass.setBooked(Math.max(0, booked - 1));
            }
        }
        
        gymClassRepository.saveAndFlush(gymClass);
        return ResponseEntity.ok(Map.of("message", "Rezervácia zrušená"));
    }

    @Transactional
    @PostMapping("/{id}/cancel")
    public ResponseEntity<?> cancelPost(@PathVariable Long id, @AuthenticationPrincipal UserDetails ud) {
        return cancel(id, ud);
    }

    // ── TRAINER/ADMIN: Get participants ─────────────────────────────────────
    @Transactional(readOnly = true)
    @GetMapping("/{id}/participants")
    public ResponseEntity<?> getParticipants(
            @PathVariable Long id,
            @AuthenticationPrincipal UserDetails userDetails) {

        User currentUser = resolveUser(userDetails);
        if (currentUser == null || (!isAdmin(currentUser) && !"trainer".equalsIgnoreCase(currentUser.getRole())))
            return ResponseEntity.status(403).body(Map.of("message", "Prístup zamietnutý"));

        GymClass gymClass = gymClassRepository.findById(id).orElse(null);
        if (gymClass == null) return ResponseEntity.notFound().build();

        List<Map<String, Object>> participants = gymClass.getReservations().stream()
                .map(r -> {
                    Map<String, Object> m = new HashMap<>();
                    m.put("id", r.getId());
                    m.put("userId", r.getUser().getId().toString());
                    m.put("fullName", r.getUser().getFullName());
                    m.put("email", r.getUser().getEmail());
                    m.put("status", r.getStatus());
                    m.put("reservedAt", r.getReservedAt());
                    return m;
                }).collect(Collectors.toList());

        return ResponseEntity.ok(participants);
    }

    // ── TRAINER: Update participant attendance ─────────────────────────────
    @Transactional
    @PatchMapping("/{classId}/attendance/{userId}")
    public ResponseEntity<?> updateAttendance(
            @PathVariable Long classId,
            @PathVariable UUID userId,
            @RequestBody Map<String, String> body,
            @AuthenticationPrincipal UserDetails userDetails) {

        User currentUser = resolveUser(userDetails);
        if (currentUser == null || (!isAdmin(currentUser) && !"trainer".equalsIgnoreCase(currentUser.getRole())))
            return ResponseEntity.status(403).build();

        GymClass gymClass = gymClassRepository.findById(classId).orElse(null);
        User targetUser = userRepository.findById(userId).orElse(null);
        if (gymClass == null || targetUser == null) return ResponseEntity.notFound().build();

        java.util.List<ClassReservation> resList = classReservationRepository.findAllByGymClassIdAndUserId(gymClass.getId(), targetUser.getId());
        if (resList.isEmpty()) return ResponseEntity.badRequest().body(Map.of("message", "Rezervácia nenájdená"));
        ClassReservation res = resList.get(0);

        String statusStr = body.get("status");
        try {
            AttendanceStatus newStatus = AttendanceStatus.valueOf(statusStr);
            AttendanceStatus oldStatus = res.getStatus();
            
            res.setStatus(newStatus);
            classReservationRepository.save(res);
            
            // Penalty logic: if marked as ABSENT (No-show)
            if (newStatus == AttendanceStatus.ABSENT && oldStatus != AttendanceStatus.ABSENT) {
                targetUser.setNoShowCount((targetUser.getNoShowCount() != null ? targetUser.getNoShowCount() : 0) + 1);
                userRepository.save(targetUser);
            }
            
            return ResponseEntity.ok(Map.of("message", "Status upravený", "status", res.getStatus(), "noShowCount", targetUser.getNoShowCount()));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("message", "Neplatný status"));
        }
    }

    // ── DELETE /api/classes/{id} ──────────────────────────────────────────────
    @DeleteMapping("/{id}")
    public ResponseEntity<?> deleteClass(
            @PathVariable Long id,
            @AuthenticationPrincipal UserDetails userDetails) {

        User currentUser = resolveUser(userDetails);
        if (!isAdmin(currentUser)) return ResponseEntity.status(403).body(Map.of("message", "Len admin môže mazať lekcie"));
        if (!gymClassRepository.existsById(id)) return ResponseEntity.notFound().build();
        gymClassRepository.deleteById(id);
        return ResponseEntity.ok(Map.of("message", "Lekcia zmazaná"));
    }

    // ── POST /api/classes ─────────────────────────────────────────────────────
    @PostMapping
    public ResponseEntity<?> createClass(
            @Valid @RequestBody CreateGymClassRequest request,
            @AuthenticationPrincipal UserDetails userDetails) {

        User currentUser = resolveUser(userDetails);
        if (currentUser == null || (!isAdmin(currentUser) && !"trainer".equalsIgnoreCase(currentUser.getRole())))
            return ResponseEntity.status(403).body(Map.of("message", "Nemáš oprávnenie vytvárať lekcie"));

        LocalDateTime startTime;
        try {
            startTime = LocalDateTime.parse(request.startTime());
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("message", "Neplatný formát dátumu"));
        }

        int duration = (request.durationMinutes() != null && request.durationMinutes() > 0) ? request.durationMinutes() : 60;
        LocalDateTime endTime = startTime.plusMinutes(duration);

        String instructorName = request.instructor();
        if (instructorName == null || instructorName.isBlank()) instructorName = currentUser.getFullName();

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

    private User resolveUser(UserDetails userDetails) {
        if (userDetails == null) return null;
        return userRepository.findByEmail(userDetails.getUsername()).orElse(null);
    }

    private boolean isAdmin(User user) {
        return user != null && "admin".equalsIgnoreCase(user.getRole());
    }

    private GymClassResponse mapToResponse(GymClass gc, User currentUser) {
        boolean isReserved = false;
        boolean isWaiting = false;
        Integer waitlistPos = null;

        if (currentUser != null && currentUser.getId() != null && gc.getId() != null) {
            java.util.List<ClassReservation> allRes = classReservationRepository.findAllByGymClassIdAndUserId(gc.getId(), currentUser.getId());

            if (!allRes.isEmpty()) {
                // Vyberieme najlepší status (prvý v liste vďaka ORDER BY status ASC)
                ClassReservation bestRes = allRes.get(0);
                AttendanceStatus status = bestRes.getStatus();
                if (status == AttendanceStatus.WAITING) {
                    isWaiting = true;
                    long betterPositions = classReservationRepository.countWaitersBeforeTime(
                            gc.getId(), AttendanceStatus.WAITING, bestRes.getReservedAt()
                    );
                    waitlistPos = (int) betterPositions + 1;
                } else if (status == AttendanceStatus.PENDING || status == AttendanceStatus.PRESENT) {
                    isReserved = true;
                }
            }
        }

        int duration = (gc.getStartTime() != null && gc.getEndTime() != null)
                ? (int) java.time.Duration.between(gc.getStartTime(), gc.getEndTime()).toMinutes()
                : 60;

        boolean isFull = false;
        if (gc.getBooked() != null && gc.getCapacity() != null) {
            isFull = gc.getBooked() >= gc.getCapacity();
        }

        long totalWaiters = classReservationRepository.countByGymClassIdAndStatus(gc.getId(), AttendanceStatus.WAITING);

        return new GymClassResponse(
                gc.getId(), gc.getName(), gc.getInstructor(), gc.getStartTime(), gc.getEndTime(),
                gc.getCapacity() != null ? gc.getCapacity() : 0,
                gc.getBooked() != null ? gc.getBooked() : 0,
                isFull, isReserved, isWaiting,
                gc.getLocation() != null ? gc.getLocation() : "", duration, waitlistPos, (int) totalWaiters
        );
    }
}
