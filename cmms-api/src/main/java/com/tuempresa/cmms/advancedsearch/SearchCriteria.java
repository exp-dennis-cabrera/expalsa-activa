package com.tuempresa.cmms.advancedsearch;

import lombok.Getter;
import lombok.Setter;
import lombok.NoArgsConstructor;
import org.springframework.data.domain.Sort.Direction;

import java.util.ArrayList;
import java.util.List;

/**
 * Copia fiel de advancedsearch/SearchCriteria.java de Atlas CMMS.
 *
 * Lo que manda el navegador al buscar: las condiciones, la pagina, el
 * tamaño y el orden.
 */
@Getter
@Setter
@NoArgsConstructor
public class SearchCriteria implements Cloneable {
    private List<FilterField> filterFields = new ArrayList<>();
    private Direction direction = Direction.ASC;
    private int pageNum = 0;
    private int pageSize = 10;
    private String sortField = "id";

    @Override
    public SearchCriteria clone() {
        try {
            SearchCriteria copia = (SearchCriteria) super.clone();
            copia.filterFields = new ArrayList<>(this.filterFields);
            return copia;
        } catch (CloneNotSupportedException e) {
            throw new AssertionError(e);
        }
    }
}
