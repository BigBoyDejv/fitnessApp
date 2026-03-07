package sk.fitness.backend.security;

import jakarta.servlet.FilterChain;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;

@Component
public class JwtAuthenticationFilter extends OncePerRequestFilter {

    private final JwtService jwtService;
    private final UserDetailsService userDetailsService;

    public JwtAuthenticationFilter(JwtService jwtService, UserDetailsService userDetailsService) {
        this.jwtService = jwtService;
        this.userDetailsService = userDetailsService;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
            throws jakarta.servlet.ServletException, IOException {

        final String authHeader = request.getHeader("Authorization");
        System.out.println("[JWT FILTER] Požiadavka: " + request.getMethod() + " " + request.getRequestURI());
        System.out.println("[JWT FILTER] Authorization header: " + authHeader);

        if (authHeader == null || !authHeader.startsWith("Bearer ")) {
            System.out.println("[JWT FILTER] Žiadny Bearer token");
            filterChain.doFilter(request, response);
            return;
        }

        String jwt = authHeader.substring(7);
        System.out.println("[JWT FILTER] Token preview: " + jwt.substring(0, 30) + "...");

        try {
            String userEmail = jwtService.extractUsername(jwt);
            System.out.println("[JWT FILTER] Extrahovaný email: " + userEmail);

            if (userEmail != null && SecurityContextHolder.getContext().getAuthentication() == null) {
                UserDetails userDetails = userDetailsService.loadUserByUsername(userEmail);
                System.out.println("[JWT FILTER] UserDetails nájdený: " + userDetails.getUsername());

                boolean valid = jwtService.isTokenValid(jwt, userDetails);
                System.out.println("[JWT FILTER] Token validný? " + valid);

                if (valid) {
                    UsernamePasswordAuthenticationToken authToken = new UsernamePasswordAuthenticationToken(
                            userDetails, null, userDetails.getAuthorities());
                    authToken.setDetails(new WebAuthenticationDetailsSource().buildDetails(request));
                    SecurityContextHolder.getContext().setAuthentication(authToken);
                    System.out.println("[JWT FILTER] Autentifikácia nastavená pre: " + userEmail);
                } else {
                    System.out.println("[JWT FILTER] Token NEPLATNÝ");
                }
            }
        } catch (Exception e) {
            System.out.println("[JWT FILTER] CHYBA: " + e.getClass().getSimpleName() + " - " + e.getMessage());
            e.printStackTrace();
        }

        filterChain.doFilter(request, response);
    }
}