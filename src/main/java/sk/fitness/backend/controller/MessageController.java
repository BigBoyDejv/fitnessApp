package sk.fitness.backend.controller;

import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import sk.fitness.backend.model.Message;
import sk.fitness.backend.model.User;
import sk.fitness.backend.repository.MessageRepository;
import org.springframework.web.bind.annotation.*;
import sk.fitness.backend.repository.UserRepository;

import java.time.LocalDateTime;
import java.util.*;

@RestController
@RequestMapping("/api/messages")
@CrossOrigin
public class MessageController {

    private final MessageRepository repo;
    private final UserRepository userRepository;

    public MessageController(MessageRepository repo, UserRepository userRepository) {
        this.repo = repo;
        this.userRepository = userRepository;
    }

    @PostMapping
    public ResponseEntity<Message> sendMessage(
            @RequestBody Message m,
            @AuthenticationPrincipal UserDetails ud) {
        User currentUser = resolveUser(ud);
        if (currentUser == null) return ResponseEntity.status(401).build();

        // Bezpečnosť: prepíš odosielateľa na aktuálne prihláseného
        m.setSenderId(currentUser.getId().toString());
        m.setCreatedAt(LocalDateTime.now());
        
        return ResponseEntity.ok(repo.save(m));
    }

    @GetMapping("/chat")
    public ResponseEntity<?> getChat(
            @RequestParam(required = false) String otherUser,
            @RequestParam(required = false) String user2,
            @AuthenticationPrincipal UserDetails ud
    ) {
        User currentUser = resolveUser(ud);
        if (currentUser == null) return ResponseEntity.status(401).build();

        String myId = currentUser.getId().toString();
        String targetId = (otherUser != null) ? otherUser : user2;
        
        if (targetId == null) return ResponseEntity.badRequest().body(Map.of("message", "Chýba ID druhého účastníka"));

        // Jedno volanie pre obe smery, zoradené podľa času
        List<Message> chat = repo.findBySenderIdAndReceiverIdOrSenderIdAndReceiverIdOrderByCreatedAtAsc(
                myId, targetId, targetId, myId
        );

        return ResponseEntity.ok(chat);
    }

    @GetMapping("/conversations")
    public ResponseEntity<?> getConversations(@AuthenticationPrincipal UserDetails ud) {
        User currentUser = resolveUser(ud);
        if (currentUser == null) return ResponseEntity.status(401).build();

        String myId = currentUser.getId().toString();
        
        Set<String> partnerIds = new HashSet<>();
        try {
            List<Message> allMyMessages = repo.findBySenderIdOrReceiverId(myId, myId);
            for (Message m : allMyMessages) {
                String sId = m.getSenderId();
                String rId = m.getReceiverId();
                if (sId != null && !sId.equalsIgnoreCase(myId)) {
                    partnerIds.add(sId.toLowerCase());
                }
                if (rId != null && !rId.equalsIgnoreCase(myId)) {
                    partnerIds.add(rId.toLowerCase());
                }
            }
        } catch (Exception e) {
            return ResponseEntity.status(500).body(Map.of("message", "Retrieving messages failed: " + e.toString()));
        }

        List<Map<String, Object>> partners = new ArrayList<>();
        for (String pid : partnerIds) {
            try {
                UUID uuid = UUID.fromString(pid);
                userRepository.findById(uuid).ifPresent(u -> {
                    Map<String, Object> m = new HashMap<>();
                    m.put("id", u.getId().toString());
                    m.put("fullName", u.getFullName());
                    m.put("avatarUrl", u.getAvatarUrl());
                    m.put("role", u.getRole());
                    m.put("specialization", u.getSpecialization());
                    partners.add(m);
                });
            } catch (Exception e) {
                // Ignore
            }
        }

        return ResponseEntity.ok(partners);
    }

    private User resolveUser(UserDetails ud) {
        if (ud == null) return null;
        return userRepository.findByEmail(ud.getUsername()).orElse(null);
    }
}