package sk.fitness.backend.repository;

import sk.fitness.backend.model.Product;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface ProductRepository extends JpaRepository<Product, Integer> {

    List<Product> findByActiveTrue();

    List<Product> findByCategoryAndActiveTrue(String category);
}