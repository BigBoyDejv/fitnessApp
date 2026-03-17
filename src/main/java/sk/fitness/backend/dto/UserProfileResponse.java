package sk.fitness.backend.dto;

import java.time.LocalDateTime;
import java.util.UUID;

public record UserProfileResponse(
        UUID id,
        String email,
        String fullName,
        String phone,
        String role,
        String avatarUrl,
        boolean isActive,
        LocalDateTime createdAt,
        UUID trainerId
) {}