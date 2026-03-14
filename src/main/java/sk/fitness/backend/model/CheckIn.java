package sk.fitness.backend.model;

import jakarta.persistence.*;
import lombok.Data;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "checkins")
@Data
public class CheckIn {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "profile_id", nullable = false)
    private User user;

    @Column(name = "checked_in_at", nullable = false)
    private LocalDateTime checkedInAt;

    // "qr", "nfc", "manual", "app"
    @Column(nullable = false)
    private String method = "qr";

    // Trvanie návštevy v minútach (vypočíta sa pri odchode alebo manuálne)
    @Column(name = "duration_minutes")
    private Integer durationMinutes;

    @PrePersist
    public void prePersist() {
        if (this.checkedInAt == null) this.checkedInAt = LocalDateTime.now();
    }
}