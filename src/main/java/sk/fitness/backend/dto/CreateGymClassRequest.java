package sk.fitness.backend.dto;

import jakarta.validation.constraints.Future;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.time.LocalDateTime;

public record CreateGymClassRequest(
        @NotBlank String name,
        @NotBlank String instructor,
        @NotNull @Future LocalDateTime startTime,
        @NotNull LocalDateTime endTime,
        @Min(1) int capacity,
        String location
) {}