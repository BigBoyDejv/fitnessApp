package sk.fitness.backend.repository;

import sk.fitness.backend.model.GymClass;
import org.springframework.data.jpa.repository.JpaRepository;
import java.time.LocalDateTime;
import java.util.List;

public interface GymClassRepository extends JpaRepository<GymClass, Long> {

    List<GymClass> findByStartTimeAfterOrderByStartTimeAsc(LocalDateTime now);
}