package sk.fitness.backend.security;

import io.jsonwebtoken.*;
import io.jsonwebtoken.io.Decoders;
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.stereotype.Service;

import java.nio.charset.StandardCharsets;
import java.security.Key;
import java.util.Date;
import java.util.HashMap;
import java.util.Map;
import java.util.function.Function;

@Service
public class JwtService {

    @Value("${jwt.secret}")
    private String secret;

    @Value("${jwt.expiration}")
    private long expiration;

    public String generateToken(UserDetails userDetails) {
        return generateToken(new HashMap<>(), userDetails);
    }

    public String generateToken(Map<String, Object> extraClaims, UserDetails userDetails) {
        Date now = new Date();
        Date expiryDate = new Date(now.getTime() + expiration);

        String token = Jwts.builder()
                .setClaims(extraClaims)
                .setSubject(userDetails.getUsername())
                .setIssuedAt(now)
                .setExpiration(expiryDate)
                .signWith(getSignInKey(), SignatureAlgorithm.HS256)
                .compact();

        System.out.println("[JWT GEN] Token vygenerovaný pre: " + userDetails.getUsername());
        System.out.println("[JWT GEN] Expirácia: " + expiryDate);
        System.out.println("[JWT GEN] Token preview: " + token.substring(0, Math.min(50, token.length())) + "...");

        return token;
    }

    public String extractUsername(String token) {
        try {
            String username = extractClaim(token, Claims::getSubject);
            System.out.println("[JWT] Extrahovaný username: " + username);
            return username;
        } catch (ExpiredJwtException e) {
            System.out.println("[JWT] Token expiroval: " + e.getMessage());
            return null;
        } catch (Exception e) {
            System.out.println("[JWT] Chyba pri extrahovaní username: " + e.getClass().getSimpleName() + " - " + e.getMessage());
            return null;
        }
    }

    public <T> T extractClaim(String token, Function<Claims, T> claimsResolver) {
        final Claims claims = extractAllClaims(token);
        return claimsResolver.apply(claims);
    }

    public boolean isTokenValid(String token, UserDetails userDetails) {
        try {
            String username = extractUsername(token);
            boolean expired = isTokenExpired(token);
            boolean match = (username != null) && username.equals(userDetails.getUsername());

            System.out.println("[JWT VALID] Validácia pre používateľa: " + userDetails.getUsername());
            System.out.println("  - Username z tokenu: " + username);
            System.out.println("  - Username z DB: " + userDetails.getUsername());
            System.out.println("  - Expirovaný? " + expired);
            System.out.println("  - Zhodujú sa? " + match);
            System.out.println("  - Celkovo validný? " + (match && !expired));

            return match && !expired;
        } catch (Exception e) {
            System.out.println("[JWT VALID] Validácia zlyhala: " + e.getClass().getSimpleName() + " - " + e.getMessage());
            return false;
        }
    }

    private boolean isTokenExpired(String token) {
        try {
            Date exp = extractExpiration(token);
            boolean expired = exp.before(new Date());
            System.out.println("[JWT] Expirácia tokenu: " + exp + " → expirovaný? " + expired);
            return expired;
        } catch (ExpiredJwtException e) {
            System.out.println("[JWT] Token expiroval: " + e.getMessage());
            return true;
        } catch (Exception e) {
            System.out.println("[JWT] Chyba pri kontrole expirácií: " + e.getMessage());
            return true;
        }
    }

    private Date extractExpiration(String token) {
        return extractClaim(token, Claims::getExpiration);
    }

    private Claims extractAllClaims(String token) {
        try {
            return Jwts.parser()
                    .setSigningKey(getSignInKey())
                    .build()
                    .parseClaimsJws(token)
                    .getBody();
        } catch (ExpiredJwtException e) {
            System.out.println("[JWT] Token expiroval pri parsovaní: " + e.getMessage());
            throw e;
        } catch (Exception e) {
            System.out.println("[JWT] Chyba pri parsovaní tokenu: " + e.getClass().getSimpleName() + " - " + e.getMessage());
            throw e;
        }
    }

    private Key getSignInKey() {
        // Use the secret directly as UTF-8 bytes instead of Base64 decoding
        byte[] keyBytes = secret.getBytes(StandardCharsets.UTF_8);
        return Keys.hmacShaKeyFor(keyBytes);
    }
}