package sk.fitness.backend.controller;

import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;

@Controller
public class LegacyRedirectController {

    // Presmeruje akýkoľvek pokus o prístup k rootu na 8080 priamo na React (port 5173)
    @GetMapping("/")
    public String redirectToReact() {
        return "redirect:http://localhost:5173";
    }
}
