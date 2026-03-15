package sk.fitness.backend.controller;

import sk.fitness.backend.model.Product;
import sk.fitness.backend.repository.ProductRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/products")
public class ProductController {

    private final ProductRepository productRepository;

    public ProductController(ProductRepository productRepository) {
        this.productRepository = productRepository;
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

    // DELETE /api/products/{id} — soft delete
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

    private boolean isAdminOrReception(UserDetails ud) {
        if (ud == null) return false;
        return ud.getAuthorities().stream().anyMatch(a -> {
            String auth = a.getAuthority();
            return auth.equals("ROLE_admin") || auth.equals("ROLE_reception")
                    || auth.equals("ROLE_ADMIN") || auth.equals("ROLE_RECEPTION");
        });
    }
}