package sk.fitness.backend.controller;

import sk.fitness.backend.model.Message;
import sk.fitness.backend.repository.MessageRepository;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@RestController
@RequestMapping("/api/messages")
@CrossOrigin
public class MessageController {

    private final MessageRepository repo;

    public MessageController(MessageRepository repo) {
        this.repo = repo;
    }

    @PostMapping
    public Message sendMessage(@RequestBody Message m) {
        System.out.println("POST /api/messages volané");
        System.out.println("Sender: " + m.getSenderId());
        System.out.println("Receiver: " + m.getReceiverId());
        System.out.println("Text: " + m.getText());

        m.setCreatedAt(LocalDateTime.now());
        return repo.save(m);
    }

    @GetMapping("/chat")
    public List<Message> getChat(
            @RequestParam String user1,
            @RequestParam String user2
    ) {
        System.out.println("GET /api/messages/chat volané");
        System.out.println("user1: " + user1);
        System.out.println("user2: " + user2);

        List<Message> chat = new ArrayList<>();

        chat.addAll(repo.findBySenderIdAndReceiverId(user1, user2));
        chat.addAll(repo.findBySenderIdAndReceiverId(user2, user1));

        chat.sort((a, b) -> a.getCreatedAt().compareTo(b.getCreatedAt()));

        return chat;
    }

}