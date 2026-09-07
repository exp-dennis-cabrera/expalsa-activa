import {
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  useReactTable,
  ColumnDef,
  PaginationState,
  OnChangeFn,
  RowData,
  SortingState,
  ColumnOrderState,
  ColumnSizingState,
  VisibilityState,
  ColumnResizeMode,
} from '@tanstack/react-table';
import {
  Box,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Paper,
  TablePagination,
  CircularProgress,
  Typography,
  useTheme,
  IconButton,
  Menu,
  MenuItem,
  Switch,
  Divider,
  alpha,
} from '@mui/material';
import { DragEvent, useState } from 'react';
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import PushPinIcon from '@mui/icons-material/PushPin';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';
import ViewColumnIcon from '@mui/icons-material/ViewColumn';

export type CustomDatagridColumn2<TData extends RowData = any> = ColumnDef<TData>;

interface CustomDatagrid2Props<TData extends RowData> {
  columns: CustomDatagridColumn2<TData>[];
  data: TData[];
  notClickable?: boolean;
  onRowClick?: (row: TData) => void;
  loading?: boolean;
  pagination?: PaginationState;
  onPaginationChange?: (pagination: PaginationState) => void;
  totalRows?: number;
  pageSizeOptions?: number[];
  sorting?: SortingState;
  onSortingChange?: OnChangeFn<SortingState>;
  noRowsMessage?: string;
  hidePagination?: boolean;
  getRowId?: (row: TData) => string;
  enableColumnReordering?: boolean;
  enableColumnResizing?: boolean;
  // Estado de columnas -- si no se provee externamente, se maneja
  // internamente (igual patron que pinnedColumns real: internal state con
  // fallback si no viene por props).
  columnOrder?: ColumnOrderState;
  onColumnOrderChange?: OnChangeFn<ColumnOrderState>;
  columnSizing?: ColumnSizingState;
  onColumnSizingChange?: OnChangeFn<ColumnSizingState>;
  columnVisibility?: VisibilityState;
  onColumnVisibilityChange?: OnChangeFn<VisibilityState>;
  pinnedColumns?: string[];
  onPinnedColumnsChange?: (pinnedColumns: string[]) => void;
}

const PINNED_BG = '#F2F5F9';

// Version fiel y completa del CustomDatagrid2 real: TanStack Table v8,
// arrastrar-para-reordenar columnas (HTML5 drag&drop nativo), redimensionar
// columnas con el mouse, y fijar/ocultar columnas desde el menu "..." de
// cada encabezado -- misma logica exacta que el original.
export default function CustomDatagrid2<TData extends RowData>({
  columns,
  data,
  notClickable,
  onRowClick,
  loading,
  pagination = { pageIndex: 0, pageSize: 10 },
  onPaginationChange = () => {},
  totalRows = 0,
  pageSizeOptions = [10, 25, 50, 100],
  sorting = [],
  onSortingChange = () => {},
  noRowsMessage,
  hidePagination,
  getRowId,
  enableColumnReordering = true,
  enableColumnResizing = true,
  columnOrder: externalColumnOrder,
  onColumnOrderChange,
  columnSizing: externalColumnSizing,
  onColumnSizingChange,
  columnVisibility: externalColumnVisibility,
  onColumnVisibilityChange,
  pinnedColumns: externalPinnedColumns,
  onPinnedColumnsChange,
}: CustomDatagrid2Props<TData>) {
  const theme = useTheme();

  const [internalColumnOrder, setInternalColumnOrder] = useState<ColumnOrderState>([]);
  const [internalColumnSizing, setInternalColumnSizing] = useState<ColumnSizingState>({});
  const [internalColumnVisibility, setInternalColumnVisibility] = useState<VisibilityState>({});
  const [internalPinnedColumns, setInternalPinnedColumns] = useState<string[]>([]);

  const columnOrder = externalColumnOrder ?? internalColumnOrder;
  const setColumnOrder: OnChangeFn<ColumnOrderState> = onColumnOrderChange ?? setInternalColumnOrder;
  const columnSizing = externalColumnSizing ?? internalColumnSizing;
  const setColumnSizing: OnChangeFn<ColumnSizingState> = onColumnSizingChange ?? setInternalColumnSizing;
  const columnVisibility = externalColumnVisibility ?? internalColumnVisibility;
  const setColumnVisibility: OnChangeFn<VisibilityState> = onColumnVisibilityChange ?? setInternalColumnVisibility;
  const pinnedColumns = externalPinnedColumns ?? internalPinnedColumns;
  const setPinnedColumns = onPinnedColumnsChange ?? setInternalPinnedColumns;

  const [draggedColumnId, setDraggedColumnId] = useState<string | null>(null);

  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [currentColumnId, setCurrentColumnId] = useState<string | null>(null);
  const [columnsMenuAnchor, setColumnsMenuAnchor] = useState<null | HTMLElement>(null);

  const table = useReactTable({
    data,
    columns,
    state: { pagination, sorting, columnOrder, columnSizing, columnVisibility },
    onPaginationChange: (updater) => {
      const next = typeof updater === 'function' ? updater(pagination) : updater;
      onPaginationChange(next);
    },
    onSortingChange,
    onColumnOrderChange: setColumnOrder,
    onColumnSizingChange: setColumnSizing,
    onColumnVisibilityChange: setColumnVisibility,
    getRowId,
    manualPagination: true,
    manualSorting: true,
    manualFiltering: true,
    pageCount: Math.ceil(totalRows / pagination.pageSize),
    getCoreRowModel: getCoreRowModel(),
    // Igual que el real: se conectan los tres modelos aunque el orden y el
    // filtrado los haga el servidor (manualSorting/manualFiltering). Sin
    // getSortedRowModel, el indicador de orden en el encabezado no refleja
    // el estado.
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    enableColumnResizing,
    columnResizeMode: 'onChange' as ColumnResizeMode,
  });

  const isColumnPinned = (columnId: string) => pinnedColumns.includes(columnId);

  const getPinnedStickyLeft = (columnId: string): number | undefined => {
    if (!isColumnPinned(columnId)) return undefined;
    const visibleHeaders = table.getHeaderGroups()[0]?.headers ?? [];
    let left = 0;
    for (const header of visibleHeaders) {
      if (header.id === columnId) break;
      if (isColumnPinned(header.id)) left += header.getSize();
    }
    return left;
  };

  function handleDragStart(e: DragEvent<HTMLTableCellElement>, columnId: string) {
    setDraggedColumnId(columnId);
    e.dataTransfer.effectAllowed = 'move';
  }
  function handleDragOver(e: DragEvent<HTMLTableCellElement>) {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  }
  function handleDrop(e: DragEvent<HTMLTableCellElement>, targetColumnId: string) {
    e.preventDefault();
    e.stopPropagation();
    if (draggedColumnId && draggedColumnId !== targetColumnId) {
      const allColumnIds = table.getAllColumns().map((col) => col.id);
      const order = columnOrder.length > 0 ? columnOrder.filter((id) => allColumnIds.includes(id)) : allColumnIds;
      const draggedIndex = order.indexOf(draggedColumnId);
      const targetIndex = order.indexOf(targetColumnId);
      if (draggedIndex !== -1 && targetIndex !== -1) {
        const newOrder = [...order];
        newOrder.splice(draggedIndex, 1);
        newOrder.splice(targetIndex, 0, draggedColumnId);
        setColumnOrder(newOrder);
      }
    }
    setDraggedColumnId(null);
  }

  function handleMenuClick(e: React.MouseEvent<HTMLButtonElement>, columnId: string) {
    e.stopPropagation();
    setAnchorEl(e.currentTarget);
    setCurrentColumnId(columnId);
  }
  function handleMenuClose() {
    setAnchorEl(null);
    setCurrentColumnId(null);
  }
  function handleColumnsMenuOpen(e: React.MouseEvent<HTMLElement>) {
    e.stopPropagation();
    setColumnsMenuAnchor(anchorEl);
    setAnchorEl(null);
  }
  function handleHideColumn() {
    if (currentColumnId) setColumnVisibility((prev) => ({ ...prev, [currentColumnId]: false }));
    handleMenuClose();
  }
  function handlePinColumn() {
    if (!currentColumnId) return;
    if (isColumnPinned(currentColumnId)) {
      setPinnedColumns(pinnedColumns.filter((id) => id !== currentColumnId));
    } else {
      setPinnedColumns([...pinnedColumns, currentColumnId]);
    }
    handleMenuClose();
  }

  return (
    <Paper sx={{ width: '100%', overflow: 'hidden', boxShadow: 'none' }} variant="outlined">
      <Box sx={{ overflow: 'auto' }}>
        <Table
          stickyHeader
          style={{ width: table.getTotalSize() }}
          sx={{
            tableLayout: 'fixed',
            minWidth: '100%',
            '& .MuiTableHead-root .MuiTableCell-head': {
              fontWeight: 'bold',
              textTransform: 'uppercase',
              fontSize: 12.5,
              borderBottom: `1px solid ${theme.palette.divider}`,
              backgroundColor: '#E8EAEE',
              position: 'sticky',
              top: 0,
            },
            '& .MuiTableBody-root .MuiTableRow-root': {
              cursor: notClickable ? 'auto' : 'pointer',
            },
          }}
        >
          <TableHead>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => {
                  const isSortable = header.column.getCanSort();
                  const sortDirection = header.column.getIsSorted();
                  const canResize = header.column.getCanResize() && enableColumnResizing;
                  const isPinned = isColumnPinned(header.id);
                  const stickyLeft = getPinnedStickyLeft(header.id);
                  const canDrag = enableColumnReordering && header.id !== 'actions';

                  return (
                    <TableCell
                      key={header.id}
                      draggable={canDrag}
                      onDragStart={(e) => (canDrag ? handleDragStart(e, header.id) : undefined)}
                      onDragOver={(e) => (canDrag ? handleDragOver(e) : undefined)}
                      onDrop={(e) => (canDrag ? handleDrop(e, header.id) : undefined)}
                      onDragEnd={() => setDraggedColumnId(null)}
                      onClick={() => isSortable && header.column.toggleSorting()}
                      sx={{
                        whiteSpace: 'nowrap',
                        position: isPinned ? 'sticky' : 'relative',
                        left: isPinned ? stickyLeft : undefined,
                        backgroundColor: isPinned ? PINNED_BG : undefined,
                        cursor: canDrag ? 'grab' : isSortable ? 'pointer' : 'default',
                        borderRight: isPinned ? `2px solid ${theme.palette.divider}` : `1px solid #F2F5F9`,
                        '&:hover .more-vert-icon': { opacity: 1 },
                        zIndex: isPinned ? 5 : 3,
                      }}
                      style={{ width: header.getSize() }}
                    >
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, flexGrow: 1 }}>
                          {flexRender(header.column.columnDef.header, header.getContext())}
                          {isSortable && sortDirection && <ArrowDownwardIcon sx={{ fontSize: 16, transform: sortDirection === 'asc' ? 'rotate(180deg)' : undefined }} />}
                        </Box>
                        <IconButton
                          className="more-vert-icon"
                          size="small"
                          onClick={(e) => handleMenuClick(e, header.id)}
                          sx={{ padding: 0.5, opacity: 0, transition: 'opacity 0.2s' }}
                        >
                          <MoreVertIcon fontSize="small" />
                        </IconButton>
                      </Box>
                      {canResize && (
                        <Box
                          onClick={(e) => e.stopPropagation()}
                          onMouseDown={(e) => {
                            e.stopPropagation();
                            header.getResizeHandler()(e);
                          }}
                          onTouchStart={(e) => {
                            e.stopPropagation();
                            header.getResizeHandler()(e);
                          }}
                          sx={{
                            position: 'absolute',
                            right: 0,
                            top: 0,
                            bottom: 0,
                            width: 5,
                            cursor: 'col-resize',
                            userSelect: 'none',
                            '&:hover': { backgroundColor: alpha(theme.palette.primary.main, 0.3) },
                          }}
                        />
                      )}
                    </TableCell>
                  );
                })}
              </TableRow>
            ))}
          </TableHead>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={columns.length} align="center" sx={{ py: 6 }}>
                  <CircularProgress size={28} />
                </TableCell>
              </TableRow>
            ) : table.getRowModel().rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={columns.length} align="center" sx={{ py: 6 }}>
                  <Typography variant="h6" sx={{ color: 'text.secondary' }}>
                    {noRowsMessage ?? 'Sin resultados.'}
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              table.getRowModel().rows.map((row) => (
                <TableRow key={row.id} hover onClick={() => !notClickable && onRowClick?.(row.original)}>
                  {row.getVisibleCells().map((cell) => {
                    const isPinned = isColumnPinned(cell.column.id);
                    const stickyLeft = getPinnedStickyLeft(cell.column.id);
                    return (
                      <TableCell
                        key={cell.id}
                        sx={{
                          // Copia fiel del real: el texto largo se corta con
                          // puntos suspensivos en vez de partir la fila en
                          // varias lineas. Asi todas las filas miden igual y
                          // la tabla se lee de un vistazo.
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          position: isPinned ? 'sticky' : undefined,
                          left: isPinned ? stickyLeft : undefined,
                          backgroundColor: isPinned ? PINNED_BG : undefined,
                          zIndex: isPinned ? 1 : undefined,
                        }}
                        style={{ width: cell.column.getSize() }}
                      >
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </TableCell>
                    );
                  })}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Box>

      {!hidePagination && (
        <TablePagination
          component="div"
          count={totalRows}
          page={pagination.pageIndex}
          onPageChange={(_, newPage) => onPaginationChange({ ...pagination, pageIndex: newPage })}
          rowsPerPage={pagination.pageSize}
          onRowsPerPageChange={(e) => onPaginationChange({ pageIndex: 0, pageSize: Number(e.target.value) })}
          rowsPerPageOptions={pageSizeOptions}
          labelRowsPerPage="Filas por página"
          labelDisplayedRows={({ from, to, count }) => `${from}–${to} de ${count}`}
        />
      )}

      <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={handleMenuClose} onClick={(e) => e.stopPropagation()}>
        <MenuItem onClick={handleColumnsMenuOpen}>
          <ViewColumnIcon sx={{ mr: 1, fontSize: 20 }} />
          Mostrar columnas
        </MenuItem>
        <Divider sx={{ my: 0.5 }} />
        <MenuItem onClick={handlePinColumn}>
          <PushPinIcon sx={{ mr: 1, fontSize: 20, color: currentColumnId && isColumnPinned(currentColumnId) ? theme.palette.primary.main : 'inherit' }} />
          {currentColumnId && isColumnPinned(currentColumnId) ? 'Desanclar' : 'Anclar'}
        </MenuItem>
        <MenuItem onClick={handleHideColumn}>
          <VisibilityOffIcon sx={{ mr: 1, fontSize: 20 }} />
          Ocultar
        </MenuItem>
      </Menu>

      <Menu anchorEl={columnsMenuAnchor} open={Boolean(columnsMenuAnchor)} onClose={() => setColumnsMenuAnchor(null)} PaperProps={{ sx: { maxHeight: 400, minWidth: 250 } }}>
        <Box sx={{ p: 1, display: 'flex', flexDirection: 'column' }}>
          <Typography variant="subtitle2" sx={{ px: 1, py: 0.5, mb: 1 }}>
            Mostrar/ocultar columnas
          </Typography>
          <Divider sx={{ mb: 1 }} />
          {table.getAllColumns().map((column) => (
            <Box key={column.id} sx={{ display: 'flex', alignItems: 'center', px: 1, py: 0.5, gap: 1 }}>
              <Switch size="small" checked={column.getIsVisible()} onChange={() => setColumnVisibility((prev) => ({ ...prev, [column.id]: !column.getIsVisible() }))} />
              <Typography sx={{ fontSize: '0.75rem', color: 'text.secondary' }}>
                {typeof column.columnDef.header === 'string' ? column.columnDef.header : column.id}
              </Typography>
            </Box>
          ))}
        </Box>
      </Menu>
    </Paper>
  );
}
