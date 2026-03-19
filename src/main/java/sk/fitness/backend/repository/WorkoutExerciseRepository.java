package sk.fitness.backend.repository;

import sk.fitness.backend.model.WorkoutExercise;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.UUID;

public interface WorkoutExerciseRepository extends JpaRepository<WorkoutExercise, UUID> {
    List<WorkoutExercise> findByWorkoutLogIdOrderBySortOrder(UUID workoutLogId);

    // Pre graf progresu — max váha pre daný cvik v čase
    @Query("SELECT w.workoutDate, MAX(s.weightKg) FROM WorkoutSet s " +
            "JOIN s.exercise e JOIN e.workoutLog w " +
            "WHERE w.user.id = :userId AND LOWER(e.exerciseName) = LOWER(:exerciseName) " +
            "GROUP BY w.workoutDate ORDER BY w.workoutDate")
    List<Object[]> findProgressForExercise(@Param("userId") UUID userId, @Param("exerciseName") String exerciseName);
}