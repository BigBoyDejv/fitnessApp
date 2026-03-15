package sk.fitness.backend.repository;

import sk.fitness.backend.model.SentMessage;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface SentMessageRepository extends JpaRepository<SentMessage, UUID> {
    List<SentMessage> findTop20ByOrderByCreatedAtDesc();
}