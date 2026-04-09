package sk.fitness.backend.dto;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class CreateGymClassRequest {

    @NotBlank(message = "Názov lekcie je povinný")
    private String name;

    private String type;

    @NotNull(message = "Čas začiatku je povinný")
    private String startTime;

    private Integer durationMinutes;

    @Min(value = 1, message = "Kapacita musí byť aspoň 1")
    private Integer capacity;

    private String location;
    private String description;
    private String instructor;
    private String trainerId;

    // Métody pre kompatibilitu s pôvodným Recordom
    public String name() { return name; }
    public String type() { return type; }
    public String startTime() { return startTime; }
    public Integer durationMinutes() { return durationMinutes; }
    public Integer capacity() { return capacity; }
    public String location() { return location; }
    public String description() { return description; }
    public String instructor() { return instructor; }
    public String trainerId() { return trainerId; }
}
