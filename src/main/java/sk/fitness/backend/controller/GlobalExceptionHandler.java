package sk.fitness.backend.controller;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ControllerAdvice;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;

import java.util.Map;

@ControllerAdvice
public class GlobalExceptionHandler {

    @ExceptionHandler(NullPointerException.class)
    public ResponseEntity<?> handleNPE(NullPointerException e) {
        e.printStackTrace();
        return ResponseEntity.status(500).body(Map.of("message", "Vyskytla sa neočakávaná chyba (NPE): " + e.getMessage()));
    }

    @ExceptionHandler(IllegalArgumentException.class)
    public ResponseEntity<?> handleIAE(IllegalArgumentException e) {
        return ResponseEntity.status(400).body(Map.of("message", "Neplatné údaje: " + e.getMessage()));
    }

    @ExceptionHandler(MethodArgumentTypeMismatchException.class)
    public ResponseEntity<?> handleTypeMismatch(MethodArgumentTypeMismatchException e) {
        return ResponseEntity.status(400).body(Map.of("message", "Nesprávny formát parametra (napr. UUID alebo ID)"));
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<?> handleGeneral(Exception e) {
        e.printStackTrace();
        return ResponseEntity.status(500).body(Map.of("message", "Všeobecná chyba servera: " + e.getMessage()));
    }
}
