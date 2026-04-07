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
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;

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

    private User resolveUser(UserDetails ud) {
        if (ud == null) return null;
        return userRepository.findByEmail(ud.getUsername()).orElse(null);
    }
}