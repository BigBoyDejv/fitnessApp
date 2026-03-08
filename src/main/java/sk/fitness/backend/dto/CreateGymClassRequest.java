package sk.fitness.backend.dto;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public record CreateGymClassRequest(

        @NotBlank(message = "Názov lekcie je povinný")
        String name,

        // Typ lekcie (CrossFit, Joga, Boxing...) — voliteľné
        String type,

        @NotNull(message = "Čas začiatku je povinný")
        String startTime,           // ISO string z frontend: "2025-03-15T09:00"

        // Trvanie v minútach — endTime sa vypočíta automaticky
        Integer durationMinutes,    // default 60 ak null

        @Min(value = 1, message = "Kapacita musí byť aspoň 1")
        Integer capacity,

        String location,
        String description,

        // Meno trénera (pre pole instructor v DB)
        String instructor,

        // UUID trénera — pre priradenie (voliteľné)
        String trainerId

) {}
