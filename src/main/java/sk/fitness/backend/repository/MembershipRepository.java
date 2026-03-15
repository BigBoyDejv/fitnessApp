package sk.fitness.backend.repository;

import sk.fitness.backend.model.Membership;
import sk.fitness.backend.model.Membership.MembershipStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface MembershipRepository extends JpaRepository<Membership, UUID> {

    // Aktívne členstvo používateľa
    Optional<Membership> findByUserIdAndStatus(UUID userId, MembershipStatus status);

    // Celá história členstviev zoradená od najnovšej
    List<Membership> findByUserIdOrderByCreatedAtDesc(UUID userId);

    // Všetky aktívne + platné členstvá (pre admin štatistiky)
    @Query("SELECT m FROM Membership m WHERE m.status = 'active' AND m.endDate >= :today")
    List<Membership> findAllActiveAndValid(@Param("today") LocalDate today);

    // Počet aktívnych členstviev podľa typu (pre admin breakdown)
    @Query("SELECT m.membershipType.name, COUNT(m) FROM Membership m " +
            "WHERE m.status = 'active' AND m.endDate >= :today " +
            "GROUP BY m.membershipType.name")
    List<Object[]> countActiveByType(@Param("today") LocalDate today);

    // Členstvá začaté v danom mesiaci a roku (pre revenue štatistiky)
    @Query("SELECT m FROM Membership m WHERE " +
            "YEAR(m.startDate) = :year AND MONTH(m.startDate) = :month AND m.status <> 'cancelled'")
    List<Membership> findByStartMonth(@Param("year") int year, @Param("month") int month);

    List<Membership> findByEndDate(LocalDate endDate);
}