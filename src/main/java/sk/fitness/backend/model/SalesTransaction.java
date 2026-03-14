package sk.fitness.backend.model;

import jakarta.persistence.*;
import lombok.Data;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Entity
@Table(name = "sales_transactions")
@Data
public class SalesTransaction {

    @Id
    @GeneratedValue
    private UUID id;

    @Column(name = "sold_by")
    private UUID soldBy;

    @Column(name = "member_id")
    private UUID memberId;

    @Column(name = "payment_method", nullable = false)
    private String paymentMethod;

    @Column(name = "total_cents", nullable = false)
    private Integer totalCents;

    private String note;

    @Column(name = "created_at")
    private LocalDateTime createdAt = LocalDateTime.now();

    @OneToMany(mappedBy = "transaction", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<SalesTransactionItem> items = new ArrayList<>();
}