package sk.fitness.backend.model;

import jakarta.persistence.*;
import lombok.Data;
import java.util.UUID;

@Entity
@Table(name = "workout_exercises")
@Data
public class WorkoutExercise {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "workout_log_id", nullable = false)
    private WorkoutLog workoutLog;

    @Column(name = "exercise_name", nullable = false)
    private String exerciseName; // napr. "Bench Press"

    @Column(name = "category")
    private String category; // "sila", "kardio"

    @Column(name = "sort_order")
    private Integer sortOrder;

    @Column(name = "track_type")
    private String trackType;
}