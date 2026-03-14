package sk.fitness.backend.model;

import jakarta.persistence.*;
import lombok.Data;
import java.time.LocalDateTime;

@Entity
@Table(name = "products")
@Data
public class Product {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String name; // napr. "Proteínový koktejl", "Energetická tyčinka"

    @Column(nullable = false)
    private String category; // napr. "nápoj", "jedlo", "doplnok", "oblečenie"

    @Column(name = "price_cents", nullable = false)
    private Integer priceCents; // napr. 350 = 3.50 €

    private String description;

    @Column(name = "is_active")
    private boolean isActive = true;

    @Column(name = "stock_quantity")
    private Integer stockQuantity = 0;

    @Column(name = "image_url")
    private String imageUrl;

    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @PrePersist
    public void prePersist() {
        this.createdAt = LocalDateTime.now();
        this.updatedAt = LocalDateTime.now();
    }

    @PreUpdate
    public void preUpdate() {
        this.updatedAt = LocalDateTime.now();
    }

    public double getPriceEuros() {
        return priceCents / 100.0;
    }
}
