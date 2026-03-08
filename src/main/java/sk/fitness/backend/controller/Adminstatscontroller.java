package sk.fitness.backend.controller;

import sk.fitness.backend.repository.UserRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

// Tento controller len preposiela volania na MembershipController
// aby admin.html mohol volať /api/admin/stats/memberships a /api/admin/stats/revenue

@RestController
@RequestMapping("/api/admin/stats")
public class Adminstatscontroller {

    private final MembershipController membershipController;
    private final UserRepository userRepository;

    public Adminstatscontroller(MembershipController membershipController,
                                UserRepository userRepository) {
        this.membershipController = membershipController;
        this.userRepository = userRepository;
    }

    @GetMapping("/memberships")
    public ResponseEntity<?> membershipStats(@AuthenticationPrincipal UserDetails ud) {
        return membershipController.membershipStats(ud);
    }

    @GetMapping("/revenue")
    public ResponseEntity<?> revenueStats(@AuthenticationPrincipal UserDetails ud) {
        return membershipController.revenueStats(ud);
    }
}