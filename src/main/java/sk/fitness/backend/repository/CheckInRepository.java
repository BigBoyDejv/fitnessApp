package sk.fitness.backend.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import sk.fitness.backend.model.CheckIn;

import java.util.List;
import java.util.UUID;

public interface CheckInRepository extends JpaRepository<CheckIn, UUID> {
    List<CheckIn> findByUserIdOrderByCheckedInAtDesc(UUID userId);

    long countByUserId(UUID userId);
}
