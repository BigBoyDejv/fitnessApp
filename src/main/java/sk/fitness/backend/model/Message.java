package sk.fitness.backend.model;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDateTime;

@Getter
@Entity
@Table(name = "messages")  // dobré mať explicitný názov tabuľky
public class Message {

    // Gettery a settery
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;  // toto môže zostať Long (autoincrement v DB)

    @Setter
    @Column(name = "sender_id", nullable = false)
    private String senderId;   // ← ZMENENÉ na String (UUID)

    @Setter
    @Column(name = "receiver_id", nullable = false)
    private String receiverId; // ← ZMENENÉ na String (UUID)

    @Setter
    @Column(length = 2000, nullable = false)  // dal som viac miesta, text môže byť dlhší
    private String text;

    @Setter
    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    // Konštruktor bez parametrov (potrebný pre JPA)
    public Message() {
    }

    // Voliteľný konštruktor pre jednoduchšie vytváranie
    public Message(String senderId, String receiverId, String text) {
        this.senderId = senderId;
        this.receiverId = receiverId;
        this.text = text;
        this.createdAt = LocalDateTime.now();
    }

    // Voliteľné: toString pre lepšie logovanie
    @Override
    public String toString() {
        return "Message{" +
                "id=" + id +
                ", senderId='" + senderId + '\'' +
                ", receiverId='" + receiverId + '\'' +
                ", text='" + text + '\'' +
                ", createdAt=" + createdAt +
                '}';
    }
}