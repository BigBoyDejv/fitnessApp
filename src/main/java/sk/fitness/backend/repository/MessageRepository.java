package sk.fitness.backend.repository;

import sk.fitness.backend.model.Message;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface MessageRepository extends JpaRepository<Message, Long> {

    List<Message> findBySenderIdAndReceiverId(String senderId, String receiverId);


}

