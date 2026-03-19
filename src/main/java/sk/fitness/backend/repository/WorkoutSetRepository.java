package sk.fitness.backend.repository;

import sk.fitness.backend.model.WorkoutSet;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface WorkoutSetRepository extends JpaRepository<WorkoutSet, UUID> {
    List<WorkoutSet> findByExerciseIdOrderBySetNumber(UUID exerciseId);
    void deleteByExerciseId(UUID exerciseId);
}