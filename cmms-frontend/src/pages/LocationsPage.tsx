import { useEffect, useMemo, useRef, useState } from 'react';
import { Box, Typography, Button, Alert, IconButton, Tooltip, CircularProgress, TextField, InputAdornment, Menu, MenuItem } from '@mui/material';
import type { ColumnDef } from '@tanstack/react-table';
import AddIcon from '@mui/icons-material/AddRounded';
import SearchIcon from '@mui/icons-material/SearchRounded';
import ReplayIcon from '@mui/icons-material/ReplayTwoTone';
import MoreVertIcon from '@mui/icons-material/MoreVertTwoTone';
import ChevronRightIcon from '@mui/icons-material/ChevronRightRounded';
import ExpandMoreIcon from '@mui/icons-material/ExpandMoreRounded';
import EditIcon from '@mui/icons-material/EditTwoTone';
import DeleteIcon from '@mui/icons-material/DeleteTwoTone';
import CreateLocationDialog from '../components/CreateLocationDialog';
import ConfirmDialog from '../components/ConfirmDialog';
import CustomDatagrid2 from '../components/CustomDatagrid2';
import LocationDetailDrawer from '../components/LocationDetailDrawer';
import { useAuth } from '../context/AuthContext';
import { useDispatch, useSelector } from '../store';
import { getLocationChildren, resetLocationsHierarchy } from '../slices/location';
import useTableState from '../hooks/useTableState';
import { locationsApi } from '../api/locations';
import type { LocationResponse } from '../types';
import { ApiRequestError } from '../api/client';

type LocationRow = LocationResponse & { depth: number };

export default function LocationsPage() {
  const { hasCreatePermission } = useAuth();
  const tableState = useTableState({ prefix: 'locations' });

  // Igual comportamiento real: mientras el buscador esta vacio, se ve la
  // jerarquia; en cuanto se escribe algo, cambia automaticamente a
  // resultados planos de busqueda -- no es un toggle manual aparte.
  const [searchInput, setSearchInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const isHierarchyView = !searchQuery.trim();
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  const [flatLocations, setFlatLocations] = useState<LocationResponse[]>([]);
  const [flatPage, setFlatPage] = useState(0);
  const [flatPageSize, setFlatPageSize] = useState(10);
  const [flatTotalElements, setFlatTotalElements] = useState(0);

  // La jerarquia vive en el store como lista plana, igual que en Atlas.
  const dispatch = useDispatch();
  const { locationsHierarchy, loadingHierarchy } = useSelector((state) => state.locations);
  const [expanded, setExpanded] = useState<Set<number>>(new Set());

  const [allLocationsForForm, setAllLocationsForForm] = useState<LocationResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingLocation, setEditingLocation] = useState<LocationResponse | null>(null);
  const [deletingLocation, setDeletingLocation] = useState<LocationResponse | null>(null);
  const [selectedLocationId, setSelectedLocationId] = useState<number | null>(null);
  const [menuAnchor, setMenuAnchor] = useState<null | HTMLElement>(null);
  const [exporting, setExporting] = useState(false);

  function loadAllForForm() {
    locationsApi.hierarchy().then(setAllLocationsForForm).catch(() => {});
  }

  async function loadRoot() {
    setLoading(true);
    setError(null);
    try {
      // Igual que el efecto real: se piden solo los nodos raiz (id = 0).
      dispatch(resetLocationsHierarchy());
      await dispatch(getLocationChildren(0, 0, 20));
      setExpanded(new Set());
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : 'No se pudieron cargar las ubicaciones');
    } finally {
      setLoading(false);
    }
  }

  async function loadFlatList(page: number, size: number, search: string) {
    setLoading(true);
    setError(null);
    try {
      const r = await locationsApi.search(page, size, search || undefined);
      setFlatLocations(r.content);
      setFlatTotalElements(r.totalElements);
      setFlatPage(page);
      setFlatPageSize(size);
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : 'No se pudieron cargar las ubicaciones');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (isHierarchyView) loadRoot();
    else loadFlatList(0, flatPageSize, searchQuery);
    loadAllForForm();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isHierarchyView, searchQuery]);

  function handleSearchChange(value: string) {
    setSearchInput(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => setSearchQuery(value), 400);
  }

  /**
   * Copia fiel de handleToggleExpand real: al abrir un nodo por primera
   * vez se piden sus hijos; si ya estan en el store, solo se alterna.
   */
  async function toggleExpand(location: LocationResponse) {
    const id = location.id;
    const wasExpanded = expanded.has(id);
    setExpanded((prev) => {
      const next = new Set(prev);
      if (wasExpanded) next.delete(id);
      else next.add(id);
      return next;
    });
    if (!wasExpanded) {
      const yaCargados = locationsHierarchy.some((l) => l.parentLocationId === id);
      if (!yaCargados) {
        await dispatch(getLocationChildren(id, 0, 20));
      }
    }
  }

  /**
   * Copia fiel de getHierarchicalData real: aplana la lista plana del store
   * segun lo que este expandido, agregando la profundidad de cada fila.
   */
  const hierarchyRows = useMemo(() => {
    function walk(parentId: number | null, depth: number): LocationRow[] {
      let result: LocationRow[] = [];
      const nodes = locationsHierarchy.filter((item) =>
        parentId === null ? !item.parentLocationId : item.parentLocationId === parentId
      );
      for (const node of nodes) {
        result.push({ ...node, depth });
        if (expanded.has(node.id)) {
          result = [...result, ...walk(node.id, depth + 1)];
        }
      }
      return result;
    }
    return walk(null, 0);
  }, [locationsHierarchy, expanded]);

  function reload() {
    if (isHierarchyView) loadRoot();
    else loadFlatList(flatPage, flatPageSize, searchQuery);
    loadAllForForm();
  }

  function handleReset() {
    setSearchInput('');
    setSearchQuery('');
    reload();
  }

  async function handleExport() {
    setMenuAnchor(null);
    setExporting(true);
    try {
      await locationsApi.export();
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : 'No se pudo exportar');
    } finally {
      setExporting(false);
    }
  }

  async function handleDelete() {
    if (!deletingLocation) return;
    try {
      await locationsApi.delete(deletingLocation.id);
      setDeletingLocation(null);
      reload();
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : 'No se pudo eliminar la ubicación');
      setDeletingLocation(null);
    }
  }

  const actionsCell = (location: LocationResponse) => (
    <Box onClick={(e) => e.stopPropagation()}>
      <Tooltip title="Editar">
        <IconButton size="small" onClick={() => { setEditingLocation(location); setDialogOpen(true); }}>
          <EditIcon fontSize="small" />
        </IconButton>
      </Tooltip>
      <Tooltip title="Eliminar">
        <IconButton size="small" onClick={() => setDeletingLocation(location)}>
          <DeleteIcon fontSize="small" color="error" />
        </IconButton>
      </Tooltip>
    </Box>
  );

  const hierarchyColumns: ColumnDef<LocationRow>[] = [
    { accessorKey: 'customId', header: 'ID', cell: (info) => info.getValue() ?? '', size: 90 },
    {
      accessorKey: 'name',
      header: 'Nombre',
      cell: (info) => {
        const location = info.row.original;
        const isExpanded = expanded.has(location.id);
        const isLoadingThis = loadingHierarchy && expanded.has(location.id);
        return (
          <Box sx={{ display: 'flex', alignItems: 'center', ml: location.depth * 3 }}>
            <IconButton size="small" onClick={(e) => { e.stopPropagation(); toggleExpand(location); }}>
              {isLoadingThis ? <CircularProgress size={16} /> : isExpanded ? <ExpandMoreIcon fontSize="small" /> : <ChevronRightIcon fontSize="small" />}
            </IconButton>
            <span style={{ fontWeight: 500 }}>{location.name}</span>
          </Box>
        );
      },
    },
    { accessorKey: 'address', header: 'Dirección', cell: (info) => info.getValue() ?? '—' },
    { accessorKey: 'createdAt', header: 'Creada', cell: (info) => new Date(info.getValue() as string).toLocaleDateString() },
    { id: 'actions', header: 'Acciones', cell: (info) => actionsCell(info.row.original) },
  ];

  const flatColumns: ColumnDef<LocationResponse>[] = [
    { accessorKey: 'customId', header: 'ID', cell: (info) => info.getValue() ?? '', size: 90 },
    { accessorKey: 'name', header: 'Nombre', cell: (info) => <span style={{ fontWeight: 500 }}>{info.getValue() as string}</span> },
    { accessorKey: 'address', header: 'Dirección', cell: (info) => info.getValue() ?? '—' },
    { accessorKey: 'createdAt', header: 'Creada', cell: (info) => new Date(info.getValue() as string).toLocaleDateString() },
    { id: 'actions', header: 'Acciones', cell: (info) => actionsCell(info.row.original) },
  ];

  return (
    <>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 3 }}>
        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
          {isHierarchyView ? `${locationsHierarchy.filter((l) => !l.parentLocationId).length} ubicación(es) raíz` : `${flatTotalElements} ubicación(es) en total`}
        </Typography>
        <Box sx={{ display: 'flex', gap: 1.5 }}>
          <TextField
            size="small"
            placeholder="Buscar…"
            value={searchInput}
            onChange={(e) => handleSearchChange(e.target.value)}
            InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment> }}
          />
          <IconButton onClick={handleReset} color="primary">
            <ReplayIcon />
          </IconButton>
          <IconButton onClick={(e) => setMenuAnchor(e.currentTarget)} color="primary">
            <MoreVertIcon />
          </IconButton>
          <Menu anchorEl={menuAnchor} open={Boolean(menuAnchor)} onClose={() => setMenuAnchor(null)}>
            <MenuItem disabled={exporting} onClick={handleExport}>
              {exporting ? 'Exportando…' : 'Exportar'}
            </MenuItem>
          </Menu>
          {hasCreatePermission('LOCATIONS') && (
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => {
                setEditingLocation(null);
                setDialogOpen(true);
              }}
            >
              Ubicación
            </Button>
          )}
        </Box>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {isHierarchyView ? (
        <CustomDatagrid2
          columns={hierarchyColumns}
          data={hierarchyRows}
          loading={loading}
          hidePagination
          noRowsMessage="No hay ubicaciones todavía. Crea la primera arriba."
          onRowClick={(row) => setSelectedLocationId(row.id)}
          columnOrder={tableState.columnOrder}
          onColumnOrderChange={tableState.setColumnOrder}
          columnSizing={tableState.columnSizing}
          onColumnSizingChange={tableState.setColumnSizing}
          columnVisibility={tableState.columnVisibility}
          onColumnVisibilityChange={tableState.setColumnVisibility}
          pinnedColumns={tableState.pinnedColumns}
          onPinnedColumnsChange={tableState.setPinnedColumns}
        />
      ) : (
        <CustomDatagrid2
          columns={flatColumns}
          data={flatLocations}
          loading={loading}
          pagination={{ pageIndex: flatPage, pageSize: flatPageSize }}
          onPaginationChange={(p) => loadFlatList(p.pageIndex, p.pageSize, searchQuery)}
          totalRows={flatTotalElements}
          noRowsMessage="No hay ubicaciones que coincidan."
          onRowClick={(row) => setSelectedLocationId(row.id)}
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

      <CreateLocationDialog
        open={dialogOpen}
        editLocation={editingLocation}
        allLocations={allLocationsForForm}
        onClose={() => {
          setDialogOpen(false);
          setEditingLocation(null);
        }}
        onSaved={reload}
      />

      <ConfirmDialog
        open={!!deletingLocation}
        onCancel={() => setDeletingLocation(null)}
        onConfirm={handleDelete}
        confirmText="Eliminar"
        question={`¿Eliminar la ubicación "${deletingLocation?.name}"? Esta acción no se puede deshacer.`}
      />

      <LocationDetailDrawer
        locationId={selectedLocationId}
        onClose={() => setSelectedLocationId(null)}
        onChanged={reload}
        allLocations={allLocationsForForm}
      />
    </>
  );
}
