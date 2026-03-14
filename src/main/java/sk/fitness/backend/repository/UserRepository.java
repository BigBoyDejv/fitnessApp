package sk.fitness.backend.repository;

import sk.fitness.backend.model.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface UserRepository extends JpaRepository<User, UUID> {

    // Prihlásenie / auth
    Optional<User> findByEmail(String email);

    // Vyhneme sa konfliktu s Hibernate Validator @UUID anotáciou
    Optional<User> findByIdEquals(UUID id);

    // Všetci používatelia s danou rolou (member, trainer, admin, reception)
    List<User> findByRole(String role);

    // Členovia priradení k danému trénera
    List<User> findByTrainerId(UUID trainerId);

    // Aktívni / neaktívni
    List<User> findByIsActive(boolean isActive);


}