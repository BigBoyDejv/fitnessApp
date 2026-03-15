package sk.fitness.backend.scheduler;

import sk.fitness.backend.model.Membership;
import sk.fitness.backend.repository.MembershipRepository;
import sk.fitness.backend.repository.NotificationRepository;
import sk.fitness.backend.service.NotificationService;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.time.LocalDate;
import java.util.List;

@Component
public class MembershipExpiryScheduler {

    private final MembershipRepository membershipRepository;
    private final NotificationService notificationService;
    private final NotificationRepository notificationRepository;

    public MembershipExpiryScheduler(MembershipRepository membershipRepository,
                                     NotificationService notificationService,
                                     NotificationRepository notificationRepository) {
        this.membershipRepository = membershipRepository;
        this.notificationService = notificationService;
        this.notificationRepository = notificationRepository;
    }

    // Každý deň o 08:00 ráno
    @Scheduled(cron = "0 0 8 * * *")
    public void checkExpiringMemberships() {
        LocalDate today = LocalDate.now();

        // Upozorni 7 dní pred vypršaním
        LocalDate in7days = today.plusDays(7);
        List<Membership> expiring7 = membershipRepository.findByEndDate(in7days);
        expiring7.forEach(m -> {
            if (m.getUser() != null && Boolean.TRUE.equals(m.getUser().getIsActive())) {
                // Skontroluj či sme už neposielali túto notifikáciu dnes
                long existing = notificationRepository
                        .countByUserIdAndIsReadFalse(m.getUser().getId());
                notificationService.warning(
                        m.getUser(),
                        "membership_expiry",
                        "Členstvo vyprší za 7 dní",
                        "Tvoje členstvo „" + m.getMembershipType().getName() +
                                " vyprší " + m.getEndDate() + ". Obnov si ho včas."
                );
            }
        });

        // Upozorni 3 dni pred vypršaním
        LocalDate in3days = today.plusDays(3);
        List<Membership> expiring3 = membershipRepository.findByEndDate(in3days);
        expiring3.forEach(m -> {
            if (m.getUser() != null && Boolean.TRUE.equals(m.getUser().getIsActive())) {
                notificationService.danger(
                        m.getUser(),
                        "membership_expiry",
                        "Členstvo vyprší za 3 dni!",
                        "Tvoje členstvo „" + m.getMembershipType().getName() +
                                " vyprší " + m.getEndDate() + ". Urýchlene si ho obnov."
                );
            }
        });

        // Upozorni v deň vypršania
        List<Membership> expiringToday = membershipRepository.findByEndDate(today);
        expiringToday.forEach(m -> {
            if (m.getUser() != null && Boolean.TRUE.equals(m.getUser().getIsActive())) {
                notificationService.danger(
                        m.getUser(),
                        "membership_expiry",
                        "Členstvo vyprší dnes!",
                        "Tvoje členstvo „" + m.getMembershipType().getName() +
                                " vyprší dnes. Po vypršaní stratíš prístup do centra."
                );
            }
        });
    }
}