package com.tuempresa.cmms.advancedsearch;

import jakarta.persistence.criteria.JoinType;
import lombok.Getter;
import lombok.Setter;
import lombok.NoArgsConstructor;

import java.util.ArrayList;
import java.util.List;

/**
 * Copia fiel de advancedsearch/FilterField.java de Atlas CMMS.
 *
 * Una condicion de filtro: sobre que campo, con que operacion y contra que
 * valor. "alternatives" permite condiciones alternativas unidas por O.
 *
 * Se omite enumName: en el original sirve para traducir enums a etiquetas
 * en varios idiomas, y aca la app es solo en español.
 */
@Getter
@Setter
@NoArgsConstructor
public class FilterField {
    private String field;
    private JoinType joinType;
    private Object value;
    private String operation;
    private List<Object> values = new ArrayList<>();
    private List<FilterField> alternatives;
}
