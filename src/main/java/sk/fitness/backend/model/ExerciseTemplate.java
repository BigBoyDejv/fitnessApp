package sk.fitness.backend.model;

import jakarta.persistence.*;
import lombok.Data;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "exercise_templates")
@Data
public class ExerciseTemplate {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "profile_id", nullable = false)
    private User user;

    @Column(name = "name", nullable = false)
    private String name;

    @Column(name = "category") // "sila", "kardio"
    private String category;

    // Čo sa trackuje: "weight_reps", "time", "time_distance", "reps_only", "custom"
    @Column(name = "track_type")
    private String trackType;

    // Vlastné popisky pre stĺpce (JSON string napr. ["Čas (min)","Vzdialenosť (km)"])
    @Column(name = "custom_labels")
    private String customLabels;

    @Column(name = "use_count")
    private Integer useCount = 0;

    @Column(name = "last_used_at")
    private LocalDateTime lastUsedAt;

    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @PrePersist
    public void prePersist() {
        this.createdAt = LocalDateTime.now();
    }
}