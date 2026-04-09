package sk.fitness.backend.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class RegisterRequest {
    @Email 
    @NotBlank 
    private String email;

    @NotBlank 
    @Size(min = 6, message = "Heslo musí mať aspoň 6 znakov") 
    private String password;

    @NotBlank 
    private String fullName;

    private String phone;
    
    // Getters for record compatibility if needed, but @Data provides them.
    // However, records use field() not getField().
    public String email() { return email; }
    public String password() { return password; }
    public String fullName() { return fullName; }
    public String phone() { return phone; }
}