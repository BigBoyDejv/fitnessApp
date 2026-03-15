package sk.fitness.backend.model;

import jakarta.persistence.*;
import lombok.Data;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "sent_messages")
@Data
public class SentMessage {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "sent_by_id", nullable = false)
    private User sentBy;

    @Column(nullable = false)
    private String title;

    @Column(nullable = false, length = 2000)
    private String message;

    @Column(nullable = false)
    private String severity = "info";

    // null = všetci, UUID = konkrétny člen
    @Column(name = "target_user_id")
    private UUID targetUserId;

    @Column(name = "recipients_count")
    private Integer recipientsCount = 0;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    @PrePersist
    public void prePersist() {
        if (this.createdAt == null) this.createdAt = LocalDateTime.now();
    }
}