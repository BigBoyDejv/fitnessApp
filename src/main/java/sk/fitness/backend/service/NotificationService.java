package sk.fitness.backend.service;

import sk.fitness.backend.model.Notification;
import sk.fitness.backend.model.User;
import sk.fitness.backend.repository.NotificationRepository;
import org.springframework.stereotype.Service;

@Service
public class NotificationService {

    private final NotificationRepository notificationRepository;

    public NotificationService(NotificationRepository notificationRepository) {
        this.notificationRepository = notificationRepository;
    }

    public void send(User user, String type, String title, String message, String severity) {
        Notification n = new Notification();
        n.setUser(user);
        n.setType(type);
        n.setTitle(title);
        n.setMessage(message);
        n.setSeverity(severity);
        n.setIsRead(false);
        notificationRepository.save(n);
    }

    // Skratky
    public void info(User user, String type, String title, String message) {
        send(user, type, title, message, "info");
    }

    public void warning(User user, String type, String title, String message) {
        send(user, type, title, message, "warning");
    }

    public void danger(User user, String type, String title, String message) {
        send(user, type, title, message, "danger");
    }
}