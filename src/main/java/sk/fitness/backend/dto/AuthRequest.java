package sk.fitness.backend.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class AuthRequest {
    @Email @NotBlank 
    private String email;
    @NotBlank 
    private String password;
    
    public String email() { return email; }
    public String password() { return password; }
}
