package sk.fitness.backend.repository;

import sk.fitness.backend.model.ClassReservation;
import sk.fitness.backend.model.GymClass;
import sk.fitness.backend.model.User;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;

public interface ClassReservationRepository extends JpaRepository<ClassReservation, Long> {
    Optional<ClassReservation> findByGymClassAndUser(GymClass gymClass, User user);
    boolean existsByGymClassAndUser(GymClass gymClass, User user);
}
