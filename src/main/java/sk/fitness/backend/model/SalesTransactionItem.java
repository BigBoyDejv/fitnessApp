package sk.fitness.backend.model;

import jakarta.persistence.*;
import lombok.Data;

@Entity
@Table(name = "sales_transaction_items")
@Data
public class SalesTransactionItem {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "transaction_id")
    private SalesTransaction transaction;

    @Column(name = "product_id")
    private Integer productId;

    @Column(name = "product_name", nullable = false)
    private String productName;

    @Column(name = "price_cents", nullable = false)
    private Integer priceCents;

    @Column(nullable = false)
    private Integer quantity = 1;
}