package sk.fitness.backend.dto;

import java.util.UUID;

public record AuthResponse(
        String token,
        String role,
        String fullName,
        String email,
        UUID id,
        String phone,
        String avatarUrl,
        boolean isActive
) {}