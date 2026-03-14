package sk.fitness.backend.model;

import jakarta.persistence.*;
import lombok.Data;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "reception_sales")
@Data
public class ReceptionSale {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "product_id", nullable = false)
    private Product product;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "sold_by_profile_id")
    private User soldBy; // recepčná / admin, ktorý predal

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "customer_profile_id")
    private User customer; // nepovinné – priradenie ku členovi

    @Column(nullable = false)
    private Integer quantity = 1;

    @Column(name = "total_price_cents", nullable = false)
    private Integer totalPriceCents; // quantity * product.priceCents

    @Column(name = "payment_method")
    private String paymentMethod = "cash"; // "cash", "card", "membership_credit"

    @Column(name = "sold_at", nullable = false)
    private LocalDateTime soldAt;

    @Column(name = "note")
    private String note;

    @PrePersist
    public void prePersist() {
        if (this.soldAt == null) this.soldAt = LocalDateTime.now();
    }

    public double getTotalPriceEuros() {
        return totalPriceCents / 100.0;
    }
}
