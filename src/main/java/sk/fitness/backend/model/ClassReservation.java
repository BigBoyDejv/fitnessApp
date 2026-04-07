package sk.fitness.backend.model;

import jakarta.persistence.*;
import lombok.Data;
import lombok.EqualsAndHashCode;
import lombok.NoArgsConstructor;
import lombok.ToString;

import java.time.LocalDateTime;

@Entity
@Table(name = "class_reservations")
@Data
@NoArgsConstructor
public class ClassReservation {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ToString.Exclude
    @EqualsAndHashCode.Exclude
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "gymclass_id", nullable = false)
    private GymClass gymClass;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Enumerated(EnumType.STRING)
    private AttendanceStatus status = AttendanceStatus.PENDING;

    private LocalDateTime reservedAt = LocalDateTime.now();

    public ClassReservation(GymClass gymClass, User user) {
        this.gymClass = gymClass;
        this.user = user;
        this.reservedAt = LocalDateTime.now();
        this.status = AttendanceStatus.PENDING;
    }
}
