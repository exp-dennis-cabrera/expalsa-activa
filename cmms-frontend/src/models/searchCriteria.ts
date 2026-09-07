/**
 * Copia de los tipos de advancedsearch del backend de Atlas CMMS.
 *
 * Es lo que espera POST /search: una lista de condiciones genericas, en vez
 * de filtros con nombre fijo.
 */
export interface FilterField {
  field: string;
  /** cn, nc, eq, ne, bw, bn, ew, en, nu, nn, gt, ge, lt, le, in, inm */
  operation: string;
  value?: unknown;
  values?: unknown[];
  joinType?: 'INNER' | 'LEFT' | 'RIGHT';
  alternatives?: FilterField[];
}

export interface SearchCriteria {
  filterFields: FilterField[];
  pageNum: number;
  pageSize: number;
  sortField: string;
  direction: 'ASC' | 'DESC';
}

export const getInitialCriteria = (): SearchCriteria => ({
  filterFields: [],
  pageNum: 0,
  pageSize: 10,
  sortField: 'id',
  direction: 'DESC',
});
