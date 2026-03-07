package sk.fitness.backend.repository;

import org.hibernate.validator.constraints.UUID;
import sk.fitness.backend.model.User;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;

public interface UserRepository extends JpaRepository<User, UUID> {
    Optional<User> findByEmail(String email);
}