package sk.fitness.backend.repository;

import sk.fitness.backend.model.ExerciseTemplate;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface ExerciseTemplateRepository extends JpaRepository<ExerciseTemplate, UUID> {

    // Všetky cviky usera zoradené podľa použitia
    List<ExerciseTemplate> findByUserIdOrderByUseCountDescLastUsedAtDesc(UUID userId);

    // Hľadanie podľa názvu
    @Query("SELECT e FROM ExerciseTemplate e WHERE e.user.id = :userId " +
            "AND LOWER(e.name) LIKE LOWER(CONCAT('%', :query, '%')) " +
            "ORDER BY e.useCount DESC")
    List<ExerciseTemplate> searchByName(@Param("userId") UUID userId, @Param("query") String query);

    // Nájdi konkrétny cvik podľa mena
    Optional<ExerciseTemplate> findByUserIdAndNameIgnoreCase(UUID userId, String name);
}