package sk.fitness.backend.dto;

import java.time.LocalDateTime;

public record GymClassResponse(
        Long id,
        String name,
        String instructor,
        LocalDateTime startTime,
        LocalDateTime endTime,
        Integer capacity,
        Integer booked,
        boolean isFull,
        boolean isReserved,
        String location,
        Integer durationMinutes     // vypočítané z startTime–endTime
) {}