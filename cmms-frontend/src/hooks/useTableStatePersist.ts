import { useCallback, useEffect, useRef } from 'react';
import type { SortingState, ColumnOrderState, ColumnSizingState, VisibilityState, PaginationState } from '@tanstack/react-table';

interface TableState {
  sorting?: SortingState;
  columnOrder?: ColumnOrderState;
  columnSizing?: ColumnSizingState;
  columnVisibility?: VisibilityState;
  pagination?: PaginationState;
  pageSize?: number;
  pinnedColumns?: string[];
}

interface UseTableStatePersistProps {
  prefix: string;
  sorting?: SortingState;
  columnOrder?: ColumnOrderState;
  columnSizing?: ColumnSizingState;
  columnVisibility?: VisibilityState;
  pagination?: PaginationState;
  pinnedColumns?: string[];
  persistPageIndex?: boolean;
}

// Copia fiel de useTableStatePersist.ts real: guarda en localStorage cada
// vez que cambia el estado de la tabla (orden/tamano/visibilidad de
// columnas, columnas ancladas, ordenamiento, tamano de pagina).
export default function useTableStatePersist({
  prefix,
  sorting,
  columnOrder,
  columnSizing,
  columnVisibility,
  pagination,
  pinnedColumns,
  persistPageIndex = false,
}: UseTableStatePersistProps) {
  const stateItem = `${prefix}TableState`;
  const isInitialMountRef = useRef(true);

  const saveSnapshot = useCallback(() => {
    if (typeof localStorage === 'undefined') return;
    const currentState: TableState = {};
    if (sorting !== undefined) currentState.sorting = sorting;
    if (columnOrder !== undefined) currentState.columnOrder = columnOrder;
    if (columnSizing !== undefined) currentState.columnSizing = columnSizing;
    if (columnVisibility !== undefined) currentState.columnVisibility = columnVisibility;
    if (pagination !== undefined) {
      if (persistPageIndex) currentState.pagination = pagination;
      else currentState.pageSize = pagination.pageSize;
    }
    if (pinnedColumns !== undefined) currentState.pinnedColumns = pinnedColumns;
    localStorage.setItem(stateItem, JSON.stringify(currentState));
  }, [stateItem, sorting, columnOrder, columnSizing, columnVisibility, pagination, pinnedColumns, persistPageIndex]);

  useEffect(() => {
    if (!isInitialMountRef.current) saveSnapshot();
  }, [saveSnapshot]);

  useEffect(() => {
    isInitialMountRef.current = false;
  }, []);

  useEffect(() => {
    window.addEventListener('beforeunload', saveSnapshot);
    return () => {
      window.removeEventListener('beforeunload', saveSnapshot);
      saveSnapshot();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [saveSnapshot]);

  return { saveSnapshot };
}
