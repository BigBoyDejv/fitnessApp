package sk.fitness.backend.repository;

import sk.fitness.backend.model.PersonalSession;
import sk.fitness.backend.model.User;
import org.springframework.data.jpa.repository.JpaRepository;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

public interface PersonalSessionRepository extends JpaRepository<PersonalSession, Long> {
    List<PersonalSession> findByTrainerId(UUID trainerId);
    List<PersonalSession> findByClientId(UUID clientId);
    List<PersonalSession> findByTrainerIdAndStartTimeAfterOrderByStartTimeAsc(UUID trainerId, LocalDateTime now);
    List<PersonalSession> findByClientIdAndStartTimeAfterOrderByStartTimeAsc(UUID clientId, LocalDateTime now);
}
