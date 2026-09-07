import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  debounce,
  Drawer,
  Card,
  Divider,
  Box,
  Typography,
  Button,
  TextField,
  Paper,
  Chip,
  Alert,
  InputAdornment,
  IconButton,
  Menu,
  MenuItem,
  Tabs,
  Tab,
} from '@mui/material';
import AddIcon from '@mui/icons-material/AddRounded';
import FilterAltTwoToneIcon from '@mui/icons-material/FilterAltTwoTone';
import CircleTwoToneIcon from '@mui/icons-material/CircleTwoTone';
import SearchIcon from '@mui/icons-material/SearchRounded';
import MoreVertIcon from '@mui/icons-material/MoreVertRounded';
import MultiSelectFilter from '../components/MultiSelectFilter';
import CreateWorkOrderDialog from '../components/CreateWorkOrderDialog';
import WorkOrderDetailDrawer from '../components/WorkOrderDetailDrawer';
import WorkOrderCalendarView from '../components/WorkOrderCalendarView';
import { workOrdersApi, buildQuery } from '../api/workOrders';
import { downloadFile } from '../api/client';
import { useDispatch, useSelector } from '../store';
import { getWorkOrders } from '../slices/workOrder';
import type { FilterField } from '../models/searchCriteria';
import WorkOrderMoreFilters from '../components/WorkOrderMoreFilters';
import type { WorkOrder, WorkOrderPriority, WorkOrderStatus } from '../types';
import { ApiRequestError } from '../api/client';
import { PRIORITY_COLORS, PRIORITY_LABELS, PRIORITY_ORDER, STATUS_LABELS, STATUS_ORDER } from '../constants';
import { useAuth } from '../context/AuthContext';
import CustomDatagrid2 from '../components/CustomDatagrid2';
import useTableState from '../hooks/useTableState';
import type { ColumnDef, SortingState } from '@tanstack/react-table';

// Igual que Atlas: por defecto vienen todas las prioridades marcadas, y todos
// los estados excepto "Completada" (para que la vista de trabajo pendiente
// no se llene de ordenes ya cerradas).
const DEFAULT_PRIORITIES = PRIORITY_ORDER as unknown as string[];
const DEFAULT_STATUSES = STATUS_ORDER.filter((s) => s !== 'COMPLETED') as unknown as string[];

/**
 * Traduce el id visual de cada columna a la propiedad real de WorkOrder.
 * Las columnas calculadas (dias desde creacion, numero de archivos) se
 * ordenan por el campo del que derivan.
 */
const SORT_FIELD_MAP: Record<string, string> = {
  customId: 'customId',
  status: 'status',
  title: 'title',
  priority: 'priority',
  description: 'description',
  primaryAssigneeName: 'primaryAssignee.firstName',
  locationName: 'location.name',
  locationAddress: 'location.address',
  categoryName: 'category.name',
  assetName: 'asset.name',
  dueDate: 'dueDate',
  daysSinceCreated: 'createdAt',
  filesCount: 'createdAt',
  requestedByName: 'createdBy.firstName',
  completedAt: 'completedAt',
  updatedAt: 'updatedAt',
  createdAt: 'createdAt',
};

export default function WorkOrdersPage() {
  const { role, hasCreatePermission } = useAuth();
  // Igual que el listado real: estado de columnas persistido en localStorage
  // (orden, tamaño, visibilidad, columnas ancladas) bajo el prefijo "workOrders".
  const tableState = useTableState({ prefix: 'workOrders' });
  // Filtros del panel lateral avanzado.
  const [advancedFilterFields, setAdvancedFilterFields] = useState<FilterField[]>([]);
  // Orden inicial igual al real: updatedAt descendente.
  const [sorting, setSorting] = useState<SortingState>([{ id: 'updatedAt', desc: true }]);
  const [openFilterDrawer, setOpenFilterDrawer] = useState(false);

  // Copia fiel de las 18 columnas del listado real de Órdenes de trabajo.
  const columns: ColumnDef<WorkOrder>[] = [
    {
      accessorKey: 'customId',
      header: 'ID',
      cell: (info) => (
        <span style={{ color: '#6b7590', fontFamily: 'monospace', fontSize: 12.5 }}>
          {(info.getValue() as string) ?? `WO${String(info.row.original.id).padStart(6, '0')}`}
        </span>
      ),
      size: 80,
    },
    {
      accessorKey: 'status',
      header: 'Estado',
      // Copia fiel del real: circulo de color + texto al lado, no un chip.
      cell: (info) => {
        const estado = info.getValue() as WorkOrder['status'];
        return (
          <Box display="flex" flexDirection="row" alignItems="center">
            <CircleTwoToneIcon
              fontSize="small"
              color={
                estado === 'IN_PROGRESS'
                  ? 'success'
                  : estado === 'ON_HOLD'
                  ? 'warning'
                  : estado === 'COMPLETED'
                  ? 'info'
                  : 'secondary'
              }
            />
            <Typography sx={{ ml: 1 }}>{STATUS_LABELS[estado]}</Typography>
          </Box>
        );
      },
      size: 150,
    },
    {
      accessorKey: 'title',
      header: 'Título',
      cell: (info) => <Box sx={{ fontWeight: 'bold' }}>{info.getValue() as string}</Box>,
      size: 150,
    },
    {
      accessorKey: 'priority',
      header: 'Prioridad',
      // Copia fiel de PriorityWrapper: etiqueta en MAYUSCULAS, 10px,
      // negrita. Si la prioridad es "Ninguna" se muestra texto plano.
      cell: (info) => {
        const p = info.getValue() as WorkOrder['priority'];
        if (p === 'NONE') return <>{PRIORITY_LABELS[p]}</>;
        return (
          <Box
            sx={{
              display: 'inline-block',
              px: 1,
              py: 0.25,
              borderRadius: 1,
              fontSize: 10,
              fontWeight: 'bold',
              textTransform: 'uppercase',
              bgcolor: PRIORITY_COLORS[p].bg,
              color: PRIORITY_COLORS[p].text,
            }}
          >
            {PRIORITY_LABELS[p]}
          </Box>
        );
      },
      size: 120,
    },
    { accessorKey: 'description', header: 'Descripción', cell: (info) => (info.getValue() as string) ?? '—', size: 300 },
    { accessorKey: 'primaryAssigneeName', header: 'Asignado a', cell: (info) => (info.getValue() as string) ?? '—', size: 170 },
    { accessorKey: 'locationName', header: 'Ubicación', cell: (info) => (info.getValue() as string) ?? '—', size: 150 },
    { accessorKey: 'locationAddress', header: 'Dirección', cell: (info) => (info.getValue() as string) ?? '—', size: 150 },
    { accessorKey: 'categoryName', header: 'Categoría', cell: (info) => (info.getValue() as string) ?? '—', size: 150 },
    { accessorKey: 'assetName', header: 'Activo', cell: (info) => (info.getValue() as string) ?? '—', size: 150 },
    {
      accessorKey: 'dueDate',
      header: 'Fecha de vencimiento',
      cell: (info) => {
        const v = info.getValue() as string | null;
        return <span style={{ fontSize: 12.5 }}>{v ? new Date(v).toLocaleString() : '—'}</span>;
      },
      size: 150,
    },
    {
      id: 'daysSinceCreated',
      header: 'Días desde creación',
      cell: (info) => {
        const dias = Math.floor((Date.now() - new Date(info.row.original.createdAt).getTime()) / 86400000);
        return <span style={{ fontSize: 12.5 }}>{dias}</span>;
      },
      size: 150,
    },
    { accessorKey: 'filesCount', header: 'Archivos', cell: (info) => (info.getValue() as number) ?? 0, size: 80 },
    { accessorKey: 'requestedByName', header: 'Solicitado por', cell: (info) => (info.getValue() as string) ?? '—', size: 150 },
    {
      accessorKey: 'completedAt',
      header: 'Completado el',
      cell: (info) => {
        const v = info.getValue() as string | null;
        return <span style={{ fontSize: 12.5 }}>{v ? new Date(v).toLocaleDateString() : '—'}</span>;
      },
      size: 140,
    },
    {
      accessorKey: 'updatedAt',
      header: 'Actualizado el',
      cell: (info) => (
        <span style={{ color: '#6b7590', fontSize: 12.5 }}>{new Date(info.getValue() as string).toLocaleDateString()}</span>
      ),
      size: 140,
    },
    {
      accessorKey: 'createdAt',
      header: 'Creado',
      cell: (info) => (
        <span style={{ color: '#6b7590', fontSize: 12.5 }}>{new Date(info.getValue() as string).toLocaleDateString()}</span>
      ),
      size: 140,
    },
  ];
  const canCreate = hasCreatePermission('WORK_ORDERS');
  const [searchParams, setSearchParams] = useSearchParams();

  // El listado vive en el store, igual que en Atlas: la pagina lo lee con
  // useSelector y lo pide con dispatch, en vez de tener su propio estado.
  const dispatch = useDispatch();
  const { workOrders: workOrdersPage, loadingGet } = useSelector((state) => state.workOrders);
  const workOrders = workOrdersPage.content;
  const totalElements = workOrdersPage.totalElements;
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [statusFilter, setStatusFilter] = useState<string[]>(DEFAULT_STATUSES);
  const [priorityFilter, setPriorityFilter] = useState<string[]>(DEFAULT_PRIORITIES);
  const [search, setSearch] = useState('');
  const [error, setError] = useState<string | null>(null);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [deepLinkedWorkOrder, setDeepLinkedWorkOrder] = useState<WorkOrder | null>(null);
  const [menuAnchor, setMenuAnchor] = useState<HTMLElement | null>(null);
  const [view, setView] = useState<'list' | 'calendar'>('list');

  const selectedWorkOrder =
    workOrders.find((wo) => wo.id === selectedId) ??
    (deepLinkedWorkOrder?.id === selectedId ? deepLinkedWorkOrder : null);

  // Soporta abrir una orden directo desde una notificacion: /work-orders?open=123
  useEffect(() => {
    const openId = searchParams.get('open');
    if (!openId) return;
    workOrdersApi
      .getById(Number(openId))
      .then((wo) => {
        setDeepLinkedWorkOrder(wo);
        setSelectedId(wo.id);
      })
      .catch(() => {})
      .finally(() => {
        searchParams.delete('open');
        setSearchParams(searchParams, { replace: true });
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /**
   * Igual que debouncedQueryChange real: se espera a que el usuario deje
   * de escribir antes de buscar, en vez de lanzar una peticion por letra.
   *
   * El original usa 1300 ms; aca 600, dentro del rango que pide el
   * documento. Va en useMemo para que la funcion no se recree en cada
   * render -- si se recreara, el temporizador se reiniciaria solo.
   */
  const debouncedQueryChange = useMemo(
    () =>
      debounce((event: React.ChangeEvent<HTMLInputElement>) => {
        setSearch(event.target.value);
        setPage(0);
      }, 600),
    []
  );

  /**
   * Arma el SearchCriteria que espera POST /search, igual que el original:
   * cada filtro es una condicion con campo, operacion y valor.
   */
  function loadWorkOrders() {
    setError(null);
    // Igual que DEFAULT_FILTER_FIELDS real: el listado NUNCA muestra las
    // archivadas. Sin este filtro seguian apareciendo despues de archivarlas.
    const filterFields: FilterField[] = [
      { field: 'archived', operation: 'eq', value: false },
    ];

    if (statusFilter.length) {
      filterFields.push({ field: 'status', operation: 'in', values: statusFilter });
    }
    if (priorityFilter.length) {
      filterFields.push({ field: 'priority', operation: 'in', values: priorityFilter });
    }
    if (search) {
      filterFields.push({ field: 'title', operation: 'cn', value: search });
    }
    // Filtros del panel avanzado (activo, ubicacion, categoria, equipo...).
    filterFields.push(...advancedFilterFields);

    dispatch(
      getWorkOrders({
        filterFields,
        pageNum: page,
        pageSize: rowsPerPage,
        // El orden lo decide el encabezado del grid.
        // El grid usa nombres visuales (primaryAssigneeName, locationName...)
        // que NO son propiedades de la entidad. Hibernate falla si se envian
        // tal cual, asi que se traducen -- igual que hace el original al
        // mapear las columnas a propiedades persistentes.
        sortField: SORT_FIELD_MAP[sorting[0]?.id ?? ''] ?? 'updatedAt',
        direction: sorting[0]?.desc === false ? 'ASC' : 'DESC',
      })
    );
  }

  useEffect(() => {
    loadWorkOrders();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, rowsPerPage, statusFilter, priorityFilter, search, advancedFilterFields, sorting]);

  // El calendario y la carga de trabajo no tienen la lista paginada cargada,
  // asi que buscan la orden directo por id (mismo mecanismo que el deep-link
  // desde notificaciones).
  async function handleSelectFromOtherView(id: number) {
    try {
      const wo = await workOrdersApi.getById(id);
      setDeepLinkedWorkOrder(wo);
      setSelectedId(wo.id);
    } catch {
      // silencioso
    }
  }

  return (
    <>
      {/* Fila de vistas (Lista/Calendario/Columna), igual que Atlas.
          Columna (Kanban) esta deshabilitada tambien en el codigo real de Atlas
          (nunca la implementaron). La Carga de Trabajo ya no vive aqui como
          pestana -- es su propio modulo "Planificador" en el sidebar. */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2.5, flexWrap: 'wrap', gap: 1.5 }}>
        <Tabs value={view} onChange={(_, v) => setView(v)} sx={{ minHeight: 0 }}>
          <Tab value="list" label="Vista de lista" sx={{ minHeight: 0 }} />
          <Tab value="calendar" label="Vista de calendario" sx={{ minHeight: 0 }} />
        </Tabs>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <IconButton onClick={(e) => setMenuAnchor(e.currentTarget)}>
            <MoreVertIcon />
          </IconButton>
          <Menu anchorEl={menuAnchor} open={!!menuAnchor} onClose={() => setMenuAnchor(null)}>
            {/* Mismas dos opciones que exportMenuItems real. */}
            <MenuItem
              onClick={() => {
                setMenuAnchor(null);
                downloadFile('/work-orders/export', 'ordenes-de-trabajo.csv');
              }}
            >
              Exportar órdenes de trabajo
            </MenuItem>
            <MenuItem
              onClick={() => {
                setMenuAnchor(null);
                downloadFile('/work-orders/export/costs-times', 'costos-y-tiempos.csv');
              }}
            >
              Exportar costos y tiempos
            </MenuItem>
            <MenuItem disabled>Importar (próximamente)</MenuItem>
          </Menu>
          {canCreate && (
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => setDialogOpen(true)}
            >
              Orden de Trabajo
            </Button>
          )}
        </Box>
      </Box>

      {view === 'calendar' && (
        <Paper variant="outlined" sx={{ p: 3 }}>
          <WorkOrderCalendarView onSelectWorkOrder={handleSelectFromOtherView} />
        </Paper>
      )}

      {/* Igual que el real: una sola Card con los filtros arriba, un
          Divider, y la tabla debajo. */}
      {view === 'list' && (
      <Card>
        <Box sx={{ display: 'flex', gap: 1.5, p: 2, flexWrap: 'wrap', alignItems: 'center' }}>
          {/* Igual que el real: abre el panel de filtros avanzados. */}
          <Button
            onClick={() => setOpenFilterDrawer(true)}
            variant="outlined"
            sx={{ '& .MuiButton-startIcon': { margin: '0px' }, minWidth: 40, height: 40, px: 1 }}
            startIcon={<FilterAltTwoToneIcon />}
          />
          <MultiSelectFilter
            label="Prioridad"
            options={PRIORITY_ORDER.map((p) => ({ value: p, label: PRIORITY_LABELS[p] }))}
            selected={priorityFilter}
            onChange={(values) => {
              setPriorityFilter(values);
              setPage(0);
            }}
          />
          <MultiSelectFilter
            label="Estado"
            options={STATUS_ORDER.map((s) => ({ value: s, label: STATUS_LABELS[s] }))}
            selected={statusFilter}
            onChange={(values) => {
              setStatusFilter(values);
              setPage(0);
            }}
          />

          <Box>
            <TextField
              size="small"
              placeholder="Buscar…"
              defaultValue={search}
              onChange={debouncedQueryChange}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon fontSize="small" />
                  </InputAdornment>
                ),
              }}
              sx={{
                width: 220,
                // La altura va en el elemento interno: es el que dibuja el
                // borde. Ponerla en el contenedor no alinea nada, porque el
                // TextField crece con el adorno de la lupa.
                '& .MuiOutlinedInput-root': { height: 40 },
              }}
            />
          </Box>
        </Box>
        <Divider />

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {loadingGet ? (
          <Typography sx={{ color: 'text.secondary', textAlign: 'center', py: 6 }}>Cargando órdenes…</Typography>
        ) : workOrders.length === 0 ? (
          <Typography sx={{ color: 'text.secondary', textAlign: 'center', py: 6 }}>
            No hay órdenes de trabajo todavía. Crea la primera arriba.
          </Typography>
        ) : (
          <CustomDatagrid2
            columns={columns}
            data={workOrders}
            loading={loadingGet}
            pagination={{ pageIndex: page, pageSize: rowsPerPage }}
            onPaginationChange={(p) => { setPage(p.pageIndex); setRowsPerPage(p.pageSize); }}
            totalRows={totalElements}
            noRowsMessage="No hay órdenes de trabajo todavía. Crea la primera arriba."
            onRowClick={(row) => setSelectedId(row.id)}
            sorting={sorting}
          onSortingChange={setSorting}
          columnOrder={tableState.columnOrder}
            onColumnOrderChange={tableState.setColumnOrder}
            columnSizing={tableState.columnSizing}
            onColumnSizingChange={tableState.setColumnSizing}
            columnVisibility={tableState.columnVisibility}
            onColumnVisibilityChange={tableState.setColumnVisibility}
            pinnedColumns={tableState.pinnedColumns}
            onPinnedColumnsChange={tableState.setPinnedColumns}
          />
        )}
      </Card>
      )}

      <CreateWorkOrderDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        onCreated={() => {
          setPage(0);
          loadWorkOrders();
        }}
      />

      <WorkOrderDetailDrawer
        workOrder={selectedWorkOrder}
        onClose={() => setSelectedId(null)}
        onChanged={loadWorkOrders}
      />
      {/* Panel de filtros avanzados. Igual que el real: a la izquierda,
          30% de ancho. */}
      <Drawer
        anchor="left"
        open={openFilterDrawer}
        onClose={() => setOpenFilterDrawer(false)}
        PaperProps={{ sx: { width: { xs: '90%', sm: '50%', md: '30%' } } }}
      >
        <WorkOrderMoreFilters
          filterFields={advancedFilterFields}
          onFilterChange={(campos) => {
            setAdvancedFilterFields(campos);
            setPage(0);
          }}
          onClose={() => setOpenFilterDrawer(false)}
        />
      </Drawer>

    </>
  );
}
