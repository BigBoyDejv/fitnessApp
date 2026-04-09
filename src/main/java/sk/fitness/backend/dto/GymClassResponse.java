package sk.fitness.backend.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.time.LocalDateTime;

@Data
@NoArgsConstructor
public class GymClassResponse {
    private Long id;
    private String name;
    private String instructor;
    private LocalDateTime startTime;
    private LocalDateTime endTime;
    private Integer capacity;
    private Integer booked;
    private boolean isFull;
    private boolean isReserved;
    private boolean isWaiting;
    private String location;
    private Integer durationMinutes;
    private Integer waitlistPosition;
    private Integer waitlistCount;

    public GymClassResponse(Long id, String name, String instructor, LocalDateTime startTime, LocalDateTime endTime, 
                            Integer capacity, Integer booked, boolean isFull, boolean isReserved, boolean isWaiting, 
                            String location, Integer durationMinutes, Integer waitlistPosition, Integer waitlistCount) {
        this.id = id;
        this.name = name;
        this.instructor = instructor;
        this.startTime = startTime;
        this.endTime = endTime;
        this.capacity = capacity;
        this.booked = booked;
        this.isFull = isFull;
        this.isReserved = isReserved;
        this.isWaiting = isWaiting;
        this.location = location;
        this.durationMinutes = durationMinutes;
        this.waitlistPosition = waitlistPosition;
        this.waitlistCount = waitlistCount;
    }
}