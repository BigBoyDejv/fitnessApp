package sk.fitness.backend.dto;

import java.time.LocalDateTime;

public record GymClassResponse(
        Long id,
        String name,
        String instructor,
        LocalDateTime startTime,
        LocalDateTime endTime,
        int capacity,
        int booked,
        boolean isFull,
        boolean isReservedByCurrentUser,
        String location
) {}