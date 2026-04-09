package sk.fitness.backend;

import org.springframework.boot.CommandLineRunner;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.context.annotation.Bean;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@EnableScheduling
public class FitnessBackendApplication {

    public static void main(String[] args) {
        SpringApplication.run(FitnessBackendApplication.class, args);
    }

    @Bean
    public CommandLineRunner updateDatabaseSchema(JdbcTemplate jdbcTemplate) {
        return args -> {
            try {
                // Odstránime starý CHECK constraint, ktorý bráni pridaniu stavu 'WAITING'
                jdbcTemplate.execute("ALTER TABLE class_reservations DROP CONSTRAINT IF EXISTS class_reservations_status_check");
                System.out.println("DATABASE FIX: Constraint class_reservations_status_check dropped (if existed).");
            } catch (Exception e) {
                System.out.println("DATABASE FIX WARNING: Could not drop constraint: " + e.getMessage());
            }
        };
    }

}
