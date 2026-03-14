package sk.fitness.backend.repository;

import sk.fitness.backend.model.Product;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.List;

public interface ProductRepository extends JpaRepository<Product, Long> {

    // Aktívne produkty (pre recepciu – zobrazenie ponuky)
    List<Product> findByIsActiveTrue();

    // Produkty podľa kategórie
    List<Product> findByCategoryAndIsActiveTrue(String category);

    // Všetky kategórie
    @Query("SELECT DISTINCT p.category FROM Product p WHERE p.isActive = true ORDER BY p.category")
    List<String> findDistinctCategories();
}
