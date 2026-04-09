package sk.fitness.backend.repository;

import sk.fitness.backend.model.GymClass;
import sk.fitness.backend.model.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.List;

public interface GymClassRepository extends JpaRepository<GymClass, Long> {

    // Všetky lekcie od teraz (GET /api/classes)
    List<GymClass> findByStartTimeAfterOrderByStartTimeAsc(LocalDateTime now);

    // Lekcie na ktoré je prihlásený konkrétny user (vrátane WAITING) - explicitný JPQL
    @Query("SELECT DISTINCT gc FROM GymClass gc JOIN gc.reservations r WHERE r.user = :user")
    List<GymClass> findMyClasses(@Param("user") User user);

    // Lekcie podľa mena trénera (GET /api/trainer/classes)
    List<GymClass> findByInstructor(String instructor);
}
