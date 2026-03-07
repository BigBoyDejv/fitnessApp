package sk.fitness.backend.repository;

import sk.fitness.backend.model.MembershipType;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface MembershipTypeRepository extends JpaRepository<MembershipType, Integer> {

    // Len aktívne typy (pre cenník)
    List<MembershipType> findByIsActiveTrue();
}
