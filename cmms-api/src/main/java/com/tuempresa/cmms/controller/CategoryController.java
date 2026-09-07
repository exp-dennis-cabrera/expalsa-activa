package com.tuempresa.cmms.controller;

import com.tuempresa.cmms.dto.request.CreateCategoryRequest;
import com.tuempresa.cmms.dto.response.CategorySummary;
import com.tuempresa.cmms.exception.ResourceNotFoundException;
import com.tuempresa.cmms.model.entity.Category;
import com.tuempresa.cmms.repository.CategoryRepository;
import com.tuempresa.cmms.security.CurrentUserProvider;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * Igual que Atlas real en espiritu: catalogo de categorias administrable,
 * separado por tipo (Work Order, Asset, Meter, Part, Timer, Cost). El real
 * usa 7 entidades/tablas separadas (WorkOrderCategory, AssetCategory, etc);
 * aqui usamos una sola tabla con un campo "type" como discriminador --
 * mismo resultado funcional (categorias independientes por tipo), con menos
 * codigo duplicado.
 */
@RestController
@RequestMapping("/categories")
@RequiredArgsConstructor
public class CategoryController {

    private final CategoryRepository categoryRepository;
    private final CurrentUserProvider currentUser;

    @GetMapping
    public List<CategorySummary> list(@RequestParam(defaultValue = "WORK_ORDER") String type) {
        return categoryRepository.findByType(type).stream().map(this::toSummary).toList();
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public CategorySummary create(@Valid @RequestBody CreateCategoryRequest request) {
        Category category = new Category();
        category.setOrganizationId(currentUser.organizationId());
        category.setName(request.name());
        category.setDescription(request.description());
        category.setType(request.type() != null ? request.type() : "WORK_ORDER");
        aplicarPadre(category, request.parentId());
        return toSummary(categoryRepository.save(category));
    }

    @PutMapping("/{id}")
    public CategorySummary update(@PathVariable Long id, @Valid @RequestBody CreateCategoryRequest request) {
        Category category = categoryRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Categoría no encontrada: id=" + id));
        category.setName(request.name());
        category.setDescription(request.description());
        aplicarPadre(category, request.parentId());
        return toSummary(categoryRepository.save(category));
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable Long id) {
        categoryRepository.deleteById(id);
    }

    /**
     * Asigna la categoria padre, con tres reglas:
     *   - Solo DOS niveles: el padre no puede tener padre a su vez.
     *   - Padre e hija deben ser del mismo tipo (no mezclar activos con
     *     medidores).
     *   - Una categoria no puede ser su propio padre.
     */
    private void aplicarPadre(Category category, Long parentId) {
        if (parentId == null) {
            category.setParent(null);
            return;
        }
        if (parentId.equals(category.getId())) {
            throw new com.tuempresa.cmms.exception.ForbiddenOperationException(
                    "Una categoría no puede ser su propia categoría padre.");
        }
        Category padre = categoryRepository.findById(parentId)
                .orElseThrow(() -> new ResourceNotFoundException("Categoría padre no encontrada: id=" + parentId));
        if (padre.getParent() != null) {
            throw new com.tuempresa.cmms.exception.ForbiddenOperationException(
                    "Solo se permiten dos niveles: la categoría elegida ya depende de otra.");
        }
        if (!padre.getType().equals(category.getType())) {
            throw new com.tuempresa.cmms.exception.ForbiddenOperationException(
                    "La categoría padre debe ser del mismo tipo.");
        }
        category.setParent(padre);
    }

    private CategorySummary toSummary(Category c) {
        return new CategorySummary(c.getId(), c.getName(), c.getDescription(), c.getType(),
                c.getParent() != null ? c.getParent().getId() : null,
                c.getParent() != null ? c.getParent().getName() : null);
    }
}
