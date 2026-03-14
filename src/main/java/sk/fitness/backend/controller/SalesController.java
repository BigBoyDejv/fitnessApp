package sk.fitness.backend.controller;

import sk.fitness.backend.model.Product;
import sk.fitness.backend.model.SalesTransaction;
import sk.fitness.backend.model.SalesTransactionItem;
import sk.fitness.backend.model.User;
import sk.fitness.backend.repository.ProductRepository;
import sk.fitness.backend.repository.SalesTransactionRepository;
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
    private final SalesTransactionRepository salesRepository;
    private final UserRepository userRepository;

    public SalesController(ProductRepository productRepository,
                           SalesTransactionRepository salesRepository,
                           UserRepository userRepository) {
        this.productRepository = productRepository;
        this.salesRepository = salesRepository;
        this.userRepository = userRepository;
    }

    @GetMapping("/products")
    public ResponseEntity<?> getProducts() {
        List<Map<String, Object>> products = productRepository.findByActiveTrue()
                .stream().map(this::productDto).collect(Collectors.toList());
        return ResponseEntity.ok(products);
    }

    @PutMapping("/products/{id}/stock")
    public ResponseEntity<?> updateStock(
            @PathVariable Integer id,
            @RequestBody Map<String, Integer> body,
            @AuthenticationPrincipal UserDetails ud) {
        User caller = resolveUser(ud);
        if (caller == null) return ResponseEntity.status(401).build();
        if (!isAdminOrReception(caller)) return ResponseEntity.status(403).build();

        Product p = productRepository.findById(id).orElse(null);
        if (p == null) return ResponseEntity.notFound().build();
        Integer stock = body.get("stock");
        if (stock == null || stock < 0) return ResponseEntity.badRequest()
                .body(Map.of("message", "Neplatny pocet kusov"));
        p.setStock(stock);
        productRepository.save(p);
        return ResponseEntity.ok(productDto(p));
    }

    @PostMapping("/transaction")
    public ResponseEntity<?> createTransaction(
            @RequestBody Map<String, Object> body,
            @AuthenticationPrincipal UserDetails ud) {
        User caller = resolveUser(ud);
        if (caller == null) return ResponseEntity.status(401).build();
        if (!isAdminOrReception(caller)) return ResponseEntity.status(403).build();

        String paymentMethod = (String) body.get("paymentMethod");
        if (paymentMethod == null) return ResponseEntity.badRequest()
                .body(Map.of("message", "Chyba paymentMethod"));

        @SuppressWarnings("unchecked")
        List<Map<String, Object>> itemsRaw = (List<Map<String, Object>>) body.get("items");
        if (itemsRaw == null || itemsRaw.isEmpty()) return ResponseEntity.badRequest()
                .body(Map.of("message", "Kosik je prazdny"));

        SalesTransaction tx = new SalesTransaction();
        tx.setSoldBy(caller.getId());
        tx.setPaymentMethod(paymentMethod);

        String memberIdStr = (String) body.get("memberId");
        if (memberIdStr != null && !memberIdStr.isBlank()) {
            try { tx.setMemberId(UUID.fromString(memberIdStr)); } catch (Exception ignored) {}
        }

        int total = 0;
        List<SalesTransactionItem> items = new ArrayList<>();
        for (Map<String, Object> raw : itemsRaw) {
            SalesTransactionItem item = new SalesTransactionItem();
            item.setTransaction(tx);
            item.setProductName((String) raw.get("productName"));
            int price = ((Number) raw.get("priceCents")).intValue();
            int qty   = ((Number) raw.get("quantity")).intValue();
            item.setPriceCents(price);
            item.setQuantity(qty);
            Object pidRaw = raw.get("productId");
            if (pidRaw != null) {
                int pid = ((Number) pidRaw).intValue();
                item.setProductId(pid);
                productRepository.findById(pid).ifPresent(p -> {
                    p.setStock(Math.max(0, p.getStock() - qty));
                    productRepository.save(p);
                });
            }
            total += price * qty;
            items.add(item);
        }
        tx.setTotalCents(total);
        tx.setItems(items);
        salesRepository.save(tx);

        return ResponseEntity.ok(Map.of(
                "id", tx.getId().toString(),
                "totalCents", total,
                "totalEuros", total / 100.0,
                "message", "Transakcia ulozena"
        ));
    }

    @GetMapping("/today")
    public ResponseEntity<?> getToday(@AuthenticationPrincipal UserDetails ud) {
        User caller = resolveUser(ud);
        if (caller == null) return ResponseEntity.status(401).build();
        if (!isAdminOrReception(caller)) return ResponseEntity.status(403).build();

        LocalDateTime from = LocalDate.now().atStartOfDay();
        LocalDateTime to   = from.plusDays(1);
        List<Map<String, Object>> txs = salesRepository
                .findByCreatedAtBetweenOrderByCreatedAtDesc(from, to)
                .stream().map(t -> txDto(t, true)).collect(Collectors.toList());
        long totalCents = salesRepository.sumTotalCentsBetween(from, to);
        return ResponseEntity.ok(Map.of(
                "transactions", txs,
                "totalCents", totalCents,
                "totalEuros", totalCents / 100.0,
                "count", txs.size()
        ));
    }

    @GetMapping("/revenue")
    public ResponseEntity<?> getRevenue(@AuthenticationPrincipal UserDetails ud) {
        User caller = resolveUser(ud);
        if (caller == null) return ResponseEntity.status(401).build();
        if (!"admin".equalsIgnoreCase(caller.getRole())) return ResponseEntity.status(403).build();

        LocalDateTime monthStart = LocalDate.now().withDayOfMonth(1).atStartOfDay();
        LocalDateTime now = LocalDateTime.now();
        LocalDateTime lastMonthStart = monthStart.minusMonths(1);
        long currentMonth = salesRepository.sumTotalCentsBetween(monthStart, now);
        long lastMonth    = salesRepository.sumTotalCentsBetween(lastMonthStart, monthStart);

        List<Map<String, Object>> monthly = new ArrayList<>();
        for (int i = 7; i >= 0; i--) {
            LocalDateTime mStart = LocalDate.now().withDayOfMonth(1).minusMonths(i).atStartOfDay();
            LocalDateTime mEnd   = mStart.plusMonths(1);
            long cents = salesRepository.sumTotalCentsBetween(mStart, mEnd);
            monthly.add(Map.of("month", mStart.getMonth().toString(), "total", cents / 100.0));
        }
        return ResponseEntity.ok(Map.of(
                "currentMonth", currentMonth / 100.0,
                "lastMonth",    lastMonth / 100.0,
                "monthly",      monthly
        ));
    }

    private User resolveUser(UserDetails ud) {
        if (ud == null) return null;
        return userRepository.findByEmail(ud.getUsername()).orElse(null);
    }
    private boolean isAdminOrReception(User u) {
        return "admin".equalsIgnoreCase(u.getRole()) || "reception".equalsIgnoreCase(u.getRole());
    }
    private Map<String, Object> productDto(Product p) {
        Map<String, Object> m = new HashMap<>();
        m.put("id", p.getId()); m.put("name", p.getName());
        m.put("description", p.getDescription());
        m.put("priceCents", p.getPriceCents());
        m.put("priceEuros", p.getPriceCents() / 100.0);
        m.put("category", p.getCategory());
        m.put("stock", p.getStock());
        m.put("active", p.getActive());
        return m;
    }
    private Map<String, Object> txDto(SalesTransaction t, boolean withItems) {
        Map<String, Object> m = new HashMap<>();
        m.put("id", t.getId().toString());
        m.put("paymentMethod", t.getPaymentMethod());
        m.put("totalCents", t.getTotalCents());
        m.put("totalEuros", t.getTotalCents() / 100.0);
        m.put("createdAt", t.getCreatedAt().toString());
        m.put("soldBy", t.getSoldBy() != null ? t.getSoldBy().toString() : null);
        m.put("memberId", t.getMemberId() != null ? t.getMemberId().toString() : null);
        if (withItems) {
            m.put("items", t.getItems().stream().map(i -> Map.of(
                    "productName", i.getProductName(),
                    "priceCents", i.getPriceCents(),
                    "quantity", i.getQuantity()
            )).collect(Collectors.toList()));
        }
        return m;
    }
}