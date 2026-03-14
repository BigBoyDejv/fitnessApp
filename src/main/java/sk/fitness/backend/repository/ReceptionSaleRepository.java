package sk.fitness.backend.repository;

import sk.fitness.backend.model.ReceptionSale;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

public interface ReceptionSaleRepository extends JpaRepository<ReceptionSale, UUID> {

    // Všetky predaje zoradené od najnovšieho
    List<ReceptionSale> findAllByOrderBySoldAtDesc();

    // Predaje za dané obdobie
    List<ReceptionSale> findBySoldAtBetweenOrderBySoldAtDesc(LocalDateTime from, LocalDateTime to);

    // ── Štatistiky pre admin ──────────────────────────────────────────────────

    // Top predávané produkty (product_name, total_quantity, total_revenue_cents)
    @Query("SELECT s.product.name, SUM(s.quantity), SUM(s.totalPriceCents) " +
            "FROM ReceptionSale s " +
            "WHERE s.soldAt BETWEEN :from AND :to " +
            "GROUP BY s.product.name " +
            "ORDER BY SUM(s.quantity) DESC")
    List<Object[]> topSellingProducts(@Param("from") LocalDateTime from, @Param("to") LocalDateTime to);

    // Predaje podľa kategórie produktu
    @Query("SELECT s.product.category, SUM(s.quantity), SUM(s.totalPriceCents) " +
            "FROM ReceptionSale s " +
            "WHERE s.soldAt BETWEEN :from AND :to " +
            "GROUP BY s.product.category " +
            "ORDER BY SUM(s.totalPriceCents) DESC")
    List<Object[]> salesByCategory(@Param("from") LocalDateTime from, @Param("to") LocalDateTime to);

    // Celková tržba (v centoch) za obdobie
    @Query("SELECT COALESCE(SUM(s.totalPriceCents), 0) FROM ReceptionSale s " +
            "WHERE s.soldAt BETWEEN :from AND :to")
    Long totalRevenueCents(@Param("from") LocalDateTime from, @Param("to") LocalDateTime to);

    // Počet transakcií za obdobie
    @Query("SELECT COUNT(s) FROM ReceptionSale s WHERE s.soldAt BETWEEN :from AND :to")
    Long countSales(@Param("from") LocalDateTime from, @Param("to") LocalDateTime to);

    // Predaje podľa spôsobu platby
    @Query("SELECT s.paymentMethod, COUNT(s), SUM(s.totalPriceCents) " +
            "FROM ReceptionSale s " +
            "WHERE s.soldAt BETWEEN :from AND :to " +
            "GROUP BY s.paymentMethod")
    List<Object[]> salesByPaymentMethod(@Param("from") LocalDateTime from, @Param("to") LocalDateTime to);

    // Denné tržby (pre graf) – vyžaduje JPQL DATE()
    @Query("SELECT CAST(s.soldAt AS LocalDate), SUM(s.totalPriceCents), COUNT(s) " +
            "FROM ReceptionSale s " +
            "WHERE s.soldAt BETWEEN :from AND :to " +
            "GROUP BY CAST(s.soldAt AS LocalDate) " +
            "ORDER BY CAST(s.soldAt AS LocalDate)")
    List<Object[]> dailyRevenue(@Param("from") LocalDateTime from, @Param("to") LocalDateTime to);

    // Mesačné tržby z recepcie
    @Query("SELECT YEAR(s.soldAt), MONTH(s.soldAt), SUM(s.totalPriceCents), COUNT(s) " +
            "FROM ReceptionSale s " +
            "WHERE s.soldAt BETWEEN :from AND :to " +
            "GROUP BY YEAR(s.soldAt), MONTH(s.soldAt) " +
            "ORDER BY YEAR(s.soldAt), MONTH(s.soldAt)")
    List<Object[]> monthlyRevenue(@Param("from") LocalDateTime from, @Param("to") LocalDateTime to);
}
