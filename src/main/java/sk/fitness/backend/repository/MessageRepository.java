package sk.fitness.backend.repository;

import sk.fitness.backend.model.Message;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.util.List;

@org.springframework.stereotype.Repository
public interface MessageRepository extends JpaRepository<Message, Long> {

    List<Message> findBySenderIdAndReceiverIdOrSenderIdAndReceiverIdOrderByCreatedAtAsc(
            String s1, String r1, String s2, String r2
    );

    List<Message> findBySenderIdOrReceiverId(String s1, String r1);
}

