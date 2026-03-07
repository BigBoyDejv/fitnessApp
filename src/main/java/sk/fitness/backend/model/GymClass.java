package sk.fitness.backend.model;

import jakarta.persistence.*;
import lombok.Data;

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
    private int capacity;              // maximálny počet ľudí
    private int booked = 0;            // aktuálne rezervovaných
    private String location;           // napr. "Štúdio 1"

    @ManyToMany
    @JoinTable(
            name = "gymclass_reservations",
            joinColumns = @JoinColumn(name = "gymclass_id"),
            inverseJoinColumns = @JoinColumn(name = "user_id")
    )
    private Set<User> reservedUsers = new HashSet<>();
}