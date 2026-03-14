package sk.fitness.backend.repository;

import sk.fitness.backend.model.CheckIn;
import org.springframework.data.jpa.repository.JpaRepository;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

public interface CheckInRepository extends JpaRepository<CheckIn, UUID> {
    List<CheckIn> findByUserIdOrderByCheckedInAtDesc(UUID userId);
    long countByUserId(UUID userId);
    List<CheckIn> findByCheckedInAtBetweenOrderByCheckedInAtDesc(LocalDateTime from, LocalDateTime to);
}