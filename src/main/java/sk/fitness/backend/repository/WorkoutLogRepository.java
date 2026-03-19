package sk.fitness.backend.repository;

import sk.fitness.backend.model.WorkoutLog;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

public interface WorkoutLogRepository extends JpaRepository<WorkoutLog, UUID> {
    List<WorkoutLog> findByUserIdOrderByWorkoutDateDesc(UUID userId);
    List<WorkoutLog> findByUserIdAndWorkoutDateBetweenOrderByWorkoutDateDesc(UUID userId, LocalDate from, LocalDate to);

    @Query("SELECT w.workoutDate FROM WorkoutLog w WHERE w.user.id = :userId AND w.workoutDate BETWEEN :from AND :to")
    List<LocalDate> findDatesByUserId(@Param("userId") UUID userId, @Param("from") LocalDate from, @Param("to") LocalDate to);
}