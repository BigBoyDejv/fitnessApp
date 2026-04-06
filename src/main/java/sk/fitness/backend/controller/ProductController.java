package sk.fitness.backend.controller;

import sk.fitness.backend.model.Product;
import sk.fitness.backend.repository.ProductRepository;
import sk.fitness.backend.repository.ReceptionSaleRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/products")
public class ProductController {

    private final ProductRepository productRepository;
    private final ReceptionSaleRepository receptionSaleRepository;

    public ProductController(ProductRepository productRepository, 
                             ReceptionSaleRepository receptionSaleRepository) {
        this.productRepository = productRepository;
        this.receptionSaleRepository = receptionSaleRepository;
    }

    // GET /api/products — aktívne produkty (pokladňa)
    @GetMapping
    public ResponseEntity<List<Product>> getActiveProducts() {
        List<Product> active = productRepository.findAll()
                .stream().filter(p -> Boolean.TRUE.equals(p.getActive())).toList();
        return ResponseEntity.ok(active);
    }

    // GET /api/products/all — všetky vrátane neaktívnych (sklad)
    @GetMapping("/all")
    public ResponseEntity<List<Product>> getAllProducts(@AuthenticationPrincipal UserDetails ud) {
        if (!isAdminOrReception(ud)) return ResponseEntity.status(403).build();
        return ResponseEntity.ok(productRepository.findAll());
    }

    // POST /api/products — nový produkt
    @PostMapping
    public ResponseEntity<?> createProduct(@RequestBody Map<String, Object> body,
                                           @AuthenticationPrincipal UserDetails ud) {
        if (!isAdminOrReception(ud)) return ResponseEntity.status(403).build();

        String name = (String) body.get("name");
        if (name == null || name.isBlank())
            return ResponseEntity.badRequest().body(Map.of("message", "Názov je povinný"));

        String category    = body.containsKey("category")    ? (String) body.get("category")    : "ostatné";
        String description = body.containsKey("description") ? (String) body.get("description") : "";
        double priceEuros  = ((Number) body.get("price")).doubleValue();
        int stock          = body.containsKey("stock") ? ((Number) body.get("stock")).intValue() : 0;

        Product p = new Product();
        p.setName(name.trim());
        p.setCategory(category.trim());
        p.setDescription(description);
        p.setPriceCents((int) Math.round(priceEuros * 100));
        p.setStock(stock);
        p.setActive(true);

        return ResponseEntity.ok(productRepository.save(p));
    }

    // PUT /api/products/{id} — upraviť produkt
    @PutMapping("/{id}")
    public ResponseEntity<?> updateProduct(@PathVariable Integer id,
                                           @RequestBody Map<String, Object> body,
                                           @AuthenticationPrincipal UserDetails ud) {
        if (!isAdminOrReception(ud)) return ResponseEntity.status(403).build();

        Product p = productRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Produkt nenájdený"));

        if (body.containsKey("name"))        p.setName(((String) body.get("name")).trim());
        if (body.containsKey("category"))    p.setCategory(((String) body.get("category")).trim());
        if (body.containsKey("description")) p.setDescription((String) body.get("description"));
        if (body.containsKey("price"))       p.setPriceCents((int) Math.round(((Number) body.get("price")).doubleValue() * 100));
        if (body.containsKey("active"))      p.setActive((Boolean) body.get("active"));
        if (body.containsKey("stock"))       p.setStock(((Number) body.get("stock")).intValue());

        return ResponseEntity.ok(productRepository.save(p));
    }

    // PATCH /api/products/{id}/stock — doplniť zásoby
    @PatchMapping("/{id}/stock")
    public ResponseEntity<?> addStock(@PathVariable Integer id,
                                      @RequestBody Map<String, Object> body,
                                      @AuthenticationPrincipal UserDetails ud) {
        if (!isAdminOrReception(ud)) return ResponseEntity.status(403).build();

        Product p = productRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Produkt nenájdený"));

        int delta    = ((Number) body.get("delta")).intValue();
        int newStock = Math.max(0, p.getStock() + delta);
        p.setStock(newStock);

        return ResponseEntity.ok(productRepository.save(p));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> deleteProduct(@PathVariable Integer id,
                                           @AuthenticationPrincipal UserDetails ud) {
        if (!isAdminOrReception(ud)) return ResponseEntity.status(403).build();

        Product p = productRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Produkt nenájdený"));
        p.setActive(false);
        productRepository.save(p);
        return ResponseEntity.ok(Map.of("message", "Produkt deaktivovaný"));
    }

    // GET /api/products/popular — štatistika predajnosti za posledných 30 dní
    @GetMapping("/popular")
    public ResponseEntity<?> getPopularityStats(@AuthenticationPrincipal UserDetails ud) {
        if (!isAdminOrReception(ud)) return ResponseEntity.status(403).build();

        LocalDateTime from = LocalDateTime.now().minusDays(30);
        LocalDateTime to = LocalDateTime.now();

        // Query vracia: [ProductName (String), TotalQty (Long), TotalRevenue (Long)]
        // Alebo ak chceme ID, musíme zmeniť repo. Poďme radšej nateraz použiť ProductName ako kľúč,
        // alebo vrátiť zoznam s menami a frontend si to spáruje.
        List<Object[]> stats = receptionSaleRepository.topSellingProducts(from, to);
        
        List<Map<String, Object>> result = new ArrayList<>();
        for (Object[] row : stats) {
            Map<String, Object> item = new HashMap<>();
            item.put("name", row[0]);
            item.put("count", row[1]);
            result.add(item);
        }
        return ResponseEntity.ok(result);
    }

    private boolean isAdminOrReception(UserDetails ud) {
        if (ud == null) return false;
        return ud.getAuthorities().stream().anyMatch(a -> {
            String auth = a.getAuthority();
            return auth.equals("ROLE_admin") || auth.equals("ROLE_reception")
                    || auth.equals("ROLE_ADMIN") || auth.equals("ROLE_RECEPTION");
        });
    }
}