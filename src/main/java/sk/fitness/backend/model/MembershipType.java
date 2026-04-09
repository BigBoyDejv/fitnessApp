package sk.fitness.backend.model;

import jakarta.persistence.*;
import lombok.Data;
import java.time.LocalDateTime;

@Entity
@Table(name = "membership_types")
@Data
public class MembershipType {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    @Column(nullable = false, unique = true)
    private String name; // Študentské, Štandard, Premium, Ročné

    @Column(name = "price_cents", nullable = false)
    private Integer priceCents; // napr. 4900 = 49.00 €

    @Column(name = "duration_days", nullable = false)
    private Integer durationDays; // 30, 365...

    private String description;

    @Column(name = "is_active")
    private boolean isActive = true;

    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @PrePersist
    public void prePersist() {
        this.createdAt = LocalDateTime.now();
    }

    public double getPriceEuros() {
        return priceCents == null ? 0.0 : priceCents / 100.0;
    }
}
