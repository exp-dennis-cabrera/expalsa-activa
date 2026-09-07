import type { FilterField } from '../models/searchCriteria';

/**
 * Copia de utils/filter.ts de Atlas CMMS (commit 44069b69).
 *
 * Traduce lo que el usuario elige en el panel a las condiciones que espera
 * el backend. Cada tipo de campo se traduce distinto:
 *
 *   simple       -> una igualdad
 *   array        -> "in" con la lista de ids (o "inm" si es muchos-a-muchos)
 *   date         -> DOS condiciones: mayor o igual que inicio, menor o igual que fin
 *   dateLessThan -> solo "menor o igual que"
 */
export type FilterFieldType = 'simple' | 'array' | 'date' | 'dateLessThan';
export type SearchOperator = 'cn' | 'nc' | 'eq' | 'ne' | 'bw' | 'bn' | 'ew' | 'en'
  | 'nu' | 'nn' | 'gt' | 'ge' | 'lt' | 'le' | 'in' | 'inm';

export const filterSingleField = (
  filters: FilterField[],
  values: Record<string, any>,
  accessor: string,
  fieldName: string,
  type: FilterFieldType,
  operator: SearchOperator = 'in'
): FilterField[] => {
  // Se quita la condicion anterior de ese campo antes de agregar la nueva.
  filters = filters.filter((filterField) => filterField.field !== fieldName);

  if (type === 'simple') {
    if (values[accessor] !== null && values[accessor] !== undefined) {
      filters.push({ field: fieldName, operation: 'eq', value: values[accessor] });
    }
  } else if (type === 'array' && values[accessor]?.length) {
    const ids = values[accessor].map((element: { value: number }) => element.value);
    filters.push({
      field: fieldName,
      operation: operator,
      // El muchos-a-muchos necesita LEFT JOIN para no perder filas.
      joinType: operator === 'inm' ? 'LEFT' : undefined,
      value: '',
      values: ids,
    });
  } else if (type === 'date' && values[accessor]?.every((date: unknown) => !!date)) {
    const [start, end] = values[accessor];
    filters = [
      ...filters,
      { field: fieldName, operation: 'ge', value: start },
      { field: fieldName, operation: 'le', value: end },
    ];
  } else if (type === 'dateLessThan' && values[accessor]) {
    filters.push({ field: fieldName, operation: 'le', value: values[accessor] });
  }
  return filters;
};
