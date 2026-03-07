package sk.fitness.backend.repository;

import sk.fitness.backend.model.GymClass;
import sk.fitness.backend.model.User;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDateTime;
import java.util.List;

public interface GymClassRepository extends JpaRepository<GymClass, Long> {

    // Všetky lekcie od teraz (GET /api/classes)
    List<GymClass> findByStartTimeAfterOrderByStartTimeAsc(LocalDateTime now);

    // Lekcie na ktoré je prihlásený konkrétny user (GET /api/classes/my)
    List<GymClass> findByReservedUsersContains(User user);

    // Lekcie podľa mena trénera (GET /api/trainer/classes)
    List<GymClass> findByInstructor(String instructor);
}
