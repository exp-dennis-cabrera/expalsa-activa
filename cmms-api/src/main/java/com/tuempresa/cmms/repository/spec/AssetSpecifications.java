package com.tuempresa.cmms.repository.spec;

import com.tuempresa.cmms.model.entity.Asset;
import com.tuempresa.cmms.model.enums.AssetStatus;
import org.springframework.data.jpa.domain.Specification;

public class AssetSpecifications {

    private AssetSpecifications() {
    }

    public static Specification<Asset> hasStatus(String status) {
        return (root, query, cb) -> {
            if (status == null || status.isBlank()) return null;
            try {
                return cb.equal(root.get("status"), AssetStatus.valueOf(status));
            } catch (IllegalArgumentException e) {
                return null;
            }
        };
    }

    public static Specification<Asset> hasLocationId(Long locationId) {
        return (root, query, cb) -> locationId == null ? null : cb.equal(root.get("location").get("id"), locationId);
    }

    public static Specification<Asset> nameContains(String search) {
        return (root, query, cb) -> (search == null || search.isBlank())
                ? null
                : cb.like(cb.lower(root.get("name")), "%" + search.toLowerCase() + "%");
    }
}
