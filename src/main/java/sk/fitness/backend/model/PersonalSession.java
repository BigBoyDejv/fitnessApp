package sk.fitness.backend.model;

import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.time.LocalDateTime;

@Entity
@Table(name = "personal_sessions")
@Data
@NoArgsConstructor
public class PersonalSession {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "trainer_id", nullable = false)
    private User trainer;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "client_id", nullable = false)
    private User client;

    private LocalDateTime startTime;
    private LocalDateTime endTime;
    
    private String title;      // napr. "Silový tréning", "Konzultácia"
    
    @Column(columnDefinition = "TEXT")
    private String notes;      // súkromné poznámky pre trénera

    @Enumerated(EnumType.STRING)
    private SessionStatus status = SessionStatus.CONFIRMED;

    @Enumerated(EnumType.STRING)
    private AttendanceStatus attendance = AttendanceStatus.PENDING;

    public enum SessionStatus {
        PENDING, CONFIRMED, CANCELED
    }

    public PersonalSession(User trainer, User client, LocalDateTime start, LocalDateTime end, String title) {
        this.trainer = trainer;
        this.client = client;
        this.startTime = start;
        this.endTime = end;
        this.title = title;
    }
}
