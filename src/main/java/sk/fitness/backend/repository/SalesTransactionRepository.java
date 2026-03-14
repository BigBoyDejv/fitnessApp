package sk.fitness.backend.repository;

import sk.fitness.backend.model.SalesTransaction;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

public interface SalesTransactionRepository extends JpaRepository<SalesTransaction, UUID> {

    List<SalesTransaction> findByCreatedAtBetweenOrderByCreatedAtDesc(
            LocalDateTime from, LocalDateTime to);

    @Query("SELECT COALESCE(SUM(t.totalCents), 0) FROM SalesTransaction t " +
            "WHERE t.createdAt BETWEEN :from AND :to")
    Long sumTotalCentsBetween(@Param("from") LocalDateTime from,
                              @Param("to") LocalDateTime to);

    @Query("SELECT COALESCE(SUM(t.totalCents), 0) FROM SalesTransaction t " +
            "WHERE t.createdAt BETWEEN :from AND :to AND t.soldBy = :sellerId")
    Long sumTotalCentsBySeller(@Param("from") LocalDateTime from,
                               @Param("to") LocalDateTime to,
                               @Param("sellerId") UUID sellerId);
}