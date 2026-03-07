package sk.fitness.backend.repository;

import sk.fitness.backend.model.Membership;
import sk.fitness.backend.model.Membership.MembershipStatus;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface MembershipRepository extends JpaRepository<Membership, UUID> {

    // Aktívne členstvo používateľa
    Optional<Membership> findByUserIdAndStatus(UUID userId, MembershipStatus status);

    // Celá história členstviev zoradená od najnovšej
    List<Membership> findByUserIdOrderByCreatedAtDesc(UUID userId);
}
