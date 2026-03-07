package sk.fitness.backend.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record RegisterRequest(
        @Email @NotBlank String email,
        @NotBlank @Size(min = 6, message = "Heslo musí mať aspoň 6 znakov") String password,
        @NotBlank String fullName,
        String phone
) {}