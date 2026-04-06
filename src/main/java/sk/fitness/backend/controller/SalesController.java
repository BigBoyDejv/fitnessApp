package sk.fitness.backend.controller;

import sk.fitness.backend.model.Product;
import sk.fitness.backend.model.ReceptionSale;
import sk.fitness.backend.model.User;
import sk.fitness.backend.repository.ProductRepository;
import sk.fitness.backend.repository.ReceptionSaleRepository;
import sk.fitness.backend.repository.UserRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/sales")
public class SalesController {

    private final ProductRepository productRepository;
    private final ReceptionSaleRepository saleRepository;
    private final UserRepository userRepository;

    public SalesController(ProductRepository productRepository,
                           ReceptionSaleRepository saleRepository,
                           UserRepository userRepository) {
        this.productRepository = productRepository;
        this.saleRepository = saleRepository;
        this.userRepository = userRepository;
    }

    // ── GET /api/sales/products ───────────────────────────────────────────────
    @GetMapping("/products")
    public ResponseEntity<?> getProducts() {
        List<Map<String, Object>> products = productRepository.findByActiveTrue()
                .stream().map(this::productDto).collect(Collectors.toList());
        return ResponseEntity.ok(products);
    }

    // ── POST /api/sales/transaction ───────────────────────────────────────────
    // Každá položka košíka = jeden ReceptionSale záznam
    @PostMapping("/transaction")
    public ResponseEntity<?> createTransaction(
            @RequestBody Map<String, Object> body,
            @AuthenticationPrincipal UserDetails ud) {

        User caller = resolveUser(ud);
        if (caller == null) return ResponseEntity.status(401).build();
        if (!isAdminOrReception(caller)) return ResponseEntity.status(403).build();

        String paymentMethod = (String) body.getOrDefault("paymentMethod", "cash");

        User customer = null;
        String memberIdStr = (String) body.get("memberId");
        if (memberIdStr != null && !memberIdStr.isBlank()) {
            try {
                customer = userRepository.findByIdEquals(UUID.fromString(memberIdStr)).orElse(null);
            } catch (Exception ignored) {}
        }

        @SuppressWarnings("unchecked")
        List<Map<String, Object>> itemsRaw = (List<Map<String, Object>>) body.get("items");
        if (itemsRaw == null || itemsRaw.isEmpty())
            return ResponseEntity.badRequest().body(Map.of("message", "Košík je prázdny"));

        int totalCents = 0;
        List<Map<String, Object>> savedItems = new ArrayList<>();

        for (Map<String, Object> raw : itemsRaw) {
            int priceCents = ((Number) raw.get("priceCents")).intValue();
            int quantity   = ((Number) raw.get("quantity")).intValue();
            Object pidRaw  = raw.get("productId");

            // Vlastný produkt bez productId — len spočítaj sumu, neukladaj do ReceptionSale
            if (pidRaw == null) {
                totalCents += priceCents * quantity;
                continue;
            }

            int productId = ((Number) pidRaw).intValue();
            Product product = productRepository.findById(productId).orElse(null);
            if (product == null) {
                totalCents += priceCents * quantity;
                continue;
            }

            // Odpiš sklad
            product.setStock(Math.max(0, product.getStock() - quantity));
            productRepository.save(product);

            // Ulož predaj do ReceptionSale
            ReceptionSale sale = new ReceptionSale();
            sale.setProduct(product);
            sale.setSoldBy(caller);
            sale.setCustomer(customer);
            sale.setQuantity(quantity);
            sale.setTotalPriceCents(priceCents * quantity);
            sale.setPaymentMethod(paymentMethod);
            sale.setSoldAt(LocalDateTime.now());
            saleRepository.save(sale);

            totalCents += priceCents * quantity;

            savedItems.add(Map.of(
                    "productName", product.getName(),
                    "quantity", quantity,
                    "priceCents", priceCents
            ));
        }

        return ResponseEntity.ok(Map.of(
                "totalCents", totalCents,
                "totalEuros", totalCents / 100.0,
                "items", savedItems,
                "message", "Transakcia uložená"
        ));
    }

    // ── GET /api/sales/today ──────────────────────────────────────────────────
    @GetMapping("/today")
    public ResponseEntity<?> getToday(@AuthenticationPrincipal UserDetails ud) {
        User caller = resolveUser(ud);
        if (caller == null) return ResponseEntity.status(401).build();
        if (!isAdminOrReception(caller)) return ResponseEntity.status(403).build();

        LocalDateTime from = LocalDate.now().atStartOfDay();
        LocalDateTime to   = from.plusDays(1);

        List<ReceptionSale> sales = saleRepository.findBySoldAtBetweenOrderBySoldAtDesc(from, to);
        long totalCents = saleRepository.totalRevenueCents(from, to);

        // Zoskup podľa produktu do "transakcií" (každý predaj je 1 transakcia)
        List<Map<String, Object>> txs = sales.stream().map(s -> {
            Map<String, Object> tx = new LinkedHashMap<>();
            tx.put("createdAt", s.getSoldAt().toString());
            tx.put("paymentMethod", s.getPaymentMethod());
            tx.put("totalEuros", s.getTotalPriceEuros());
            tx.put("totalCents", s.getTotalPriceCents());
            tx.put("userName", s.getCustomer() != null ? s.getCustomer().getFullName() : null);
            tx.put("items", List.of(Map.of(
                    "productName", s.getProduct() != null ? s.getProduct().getName() : "—",
                    "quantity", s.getQuantity()
            )));
            return tx;
        }).collect(Collectors.toList());

        return ResponseEntity.ok(Map.of(
                "transactions", txs,
                "totalCents",   totalCents,
                "totalEuros",   totalCents / 100.0,
                "count",        txs.size()
        ));
    }

    // ── Pomocné ───────────────────────────────────────────────────────────────
    private User resolveUser(UserDetails ud) {
        if (ud == null) return null;
        return userRepository.findByEmail(ud.getUsername()).orElse(null);
    }

    private boolean isAdminOrReception(User u) {
        return "admin".equalsIgnoreCase(u.getRole()) ||
                "reception".equalsIgnoreCase(u.getRole());
    }

    private Map<String, Object> productDto(Product p) {
        Map<String, Object> m = new HashMap<>();
        m.put("id",          p.getId());
        m.put("name",        p.getName());
        m.put("description", p.getDescription());
        m.put("priceCents",  p.getPriceCents());
        m.put("priceEuros",  p.getPriceCents() / 100.0);
        m.put("category",    p.getCategory());
        m.put("stock",       p.getStock());
        m.put("active",      p.getActive());
        return m;
    }
}