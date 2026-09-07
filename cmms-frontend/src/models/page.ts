/**
 * Copia de models/owns/page.ts de Atlas CMMS (commit 44069b69).
 *
 * Es la forma que devuelve Spring Data al paginar -- la misma que ya
 * responde el backend de Expalsa, asi que no hace falta convertir nada.
 */
export interface Page<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  last: boolean;
  size: number;
  number: number;
  numberOfElements: number;
  first: boolean;
  empty: boolean;
  sort: { empty: boolean; sorted: boolean; unsorted: boolean };
}

export const getInitialPage = <T>(): Page<T> => {
  return {
    content: [],
    totalElements: 0,
    totalPages: 0,
    last: true,
    size: 10,
    number: 0,
    numberOfElements: 0,
    first: true,
    empty: true,
    sort: { empty: true, sorted: true, unsorted: false }
  };
};

export type Sort = `${string},asc` | `${string},desc`;
