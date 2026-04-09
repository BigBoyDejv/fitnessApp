package sk.fitness.backend.repository;

import sk.fitness.backend.model.AttendanceStatus;
import sk.fitness.backend.model.ClassReservation;
import sk.fitness.backend.model.GymClass;
import sk.fitness.backend.model.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.Optional;
import java.util.UUID;

public interface ClassReservationRepository extends JpaRepository<ClassReservation, Long> {

    // Nájde rezerváciu podľa ID lekcie a EMAILU užívateľa (case-insensitive)
    @Query("SELECT cr FROM ClassReservation cr WHERE cr.gymClass.id = :gymClassId AND LOWER(cr.user.email) = LOWER(:email)")
    Optional<ClassReservation> findByGymClassIdAndUserEmail(@Param("gymClassId") Long gymClassId, @Param("email") String email);

    // Nájde rezervácie podľa ID lekcie a ID užívateľa (zoradené podľa priority statusu - PENDING pred WAITING)
    @Query("SELECT cr FROM ClassReservation cr WHERE cr.gymClass.id = :gymClassId AND cr.user.id = :userId ORDER BY cr.status ASC")
    java.util.List<ClassReservation> findAllByGymClassIdAndUserId(@Param("gymClassId") Long gymClassId, @Param("userId") java.util.UUID userId);

    // Overí existenciu rezervácie
    @Query("SELECT CASE WHEN COUNT(cr) > 0 THEN TRUE ELSE FALSE END FROM ClassReservation cr WHERE cr.gymClass.id = :gymClassId AND cr.user.id = :userId")
    boolean existsByGymClassIdAndUserId(@Param("gymClassId") Long gymClassId, @Param("userId") UUID userId);

    // Nájde prvého čakateľa v rade
    Optional<ClassReservation> findFirstByGymClassAndStatusOrderByReservedAtAsc(GymClass gymClass, AttendanceStatus status);

    // Počet čakajúcich s skorším časom (na výpočet pozície v rade)
    @Query("SELECT COUNT(cr) FROM ClassReservation cr WHERE cr.gymClass.id = :gymClassId AND cr.status = :status AND cr.reservedAt < :reservedAt")
    long countWaitersBeforeTime(@Param("gymClassId") Long gymClassId, @Param("status") AttendanceStatus status, @Param("reservedAt") LocalDateTime reservedAt);

    // Celkový počet ľudí na čakačke
    @Query("SELECT COUNT(cr) FROM ClassReservation cr WHERE cr.gymClass.id = :gymClassId AND cr.status = :status")
    long countByGymClassIdAndStatus(@Param("gymClassId") Long gymClassId, @Param("status") AttendanceStatus status);
}
