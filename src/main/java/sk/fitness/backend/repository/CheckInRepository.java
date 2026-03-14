package sk.fitness.backend.repository;

import sk.fitness.backend.model.CheckIn;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

public interface CheckInRepository extends JpaRepository<CheckIn, UUID> {

    List<CheckIn> findByUserIdOrderByCheckedInAtDesc(UUID userId);

    long countByUserId(UUID userId);

    List<CheckIn> findByCheckedInAtBetweenOrderByCheckedInAtDesc(LocalDateTime from, LocalDateTime to);

    // ── Štatistiky pre admin ──────────────────────────────────────────────────

    // Počet check-in-ov podľa hodiny (0-23)
    @Query("SELECT HOUR(c.checkedInAt), COUNT(c) FROM CheckIn c " +
            "WHERE c.checkedInAt BETWEEN :from AND :to " +
            "GROUP BY HOUR(c.checkedInAt) " +
            "ORDER BY HOUR(c.checkedInAt)")
    List<Object[]> countByHour(@Param("from") LocalDateTime from, @Param("to") LocalDateTime to);

    // Počet check-in-ov podľa dňa v týždni (1=Mon ... 7=Sun pre PostgreSQL EXTRACT(ISODOW))
    @Query(value = "SELECT EXTRACT(ISODOW FROM checked_in_at) AS dow, COUNT(*) " +
            "FROM checkins " +
            "WHERE checked_in_at BETWEEN :from AND :to " +
            "GROUP BY dow ORDER BY dow",
            nativeQuery = true)
    List<Object[]> countByDayOfWeek(@Param("from") LocalDateTime from, @Param("to") LocalDateTime to);

    // Počet check-in-ov podľa dňa (pre graf)
    @Query("SELECT CAST(c.checkedInAt AS LocalDate), COUNT(c) FROM CheckIn c " +
            "WHERE c.checkedInAt BETWEEN :from AND :to " +
            "GROUP BY CAST(c.checkedInAt AS LocalDate) " +
            "ORDER BY CAST(c.checkedInAt AS LocalDate)")
    List<Object[]> countByDay(@Param("from") LocalDateTime from, @Param("to") LocalDateTime to);

    // Celkový počet check-in-ov za obdobie
    @Query("SELECT COUNT(c) FROM CheckIn c WHERE c.checkedInAt BETWEEN :from AND :to")
    long countBetween(@Param("from") LocalDateTime from, @Param("to") LocalDateTime to);
}