package sk.fitness.backend.repository;

import sk.fitness.backend.model.WorkoutPreset;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.UUID;

public interface WorkoutPresetRepository extends JpaRepository<WorkoutPreset, UUID> {
    List<WorkoutPreset> findByUserIdOrderByLastUsedAtDescNameAsc(UUID userId);
    List<WorkoutPreset> findByUserIdInAndIsSharedTrueOrderByLastUsedAtDesc(List<UUID> userIds);
}