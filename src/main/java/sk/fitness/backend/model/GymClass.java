package sk.fitness.backend.model;

import jakarta.persistence.*;
import lombok.Data;
import lombok.EqualsAndHashCode;
import lombok.ToString;

import java.time.LocalDateTime;
import java.util.HashSet;
import java.util.Set;

@Entity
@Data
public class GymClass {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String name;               // napr. "Yoga Flow", "HIIT", "Spinning"
    private String instructor;         // meno trénera
    private LocalDateTime startTime;
    private LocalDateTime endTime;
    private Integer capacity;              // maximálny počet ľudí
    private Integer booked = 0;            // aktuálne rezervovaných
    private String location;           // napr. "Štúdio 1"

    @ToString.Exclude
    @EqualsAndHashCode.Exclude
    @OneToMany(mappedBy = "gymClass", cascade = CascadeType.ALL, orphanRemoval = true)
    private Set<ClassReservation> reservations = new HashSet<>();
}