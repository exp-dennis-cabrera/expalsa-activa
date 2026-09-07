import { useEffect, useRef, useState } from 'react';
import {
  Stack,
  TextField,
  InputAdornment,
  FormControlLabel,
  Switch,
  Box,
  Typography,
  Paper,
  Chip,
  Alert,
  Button,
  IconButton,
  Menu,
  MenuItem,
} from '@mui/material';
import AddIcon from '@mui/icons-material/AddRounded';
import MoreVertIcon from '@mui/icons-material/MoreVertRounded';
import FileDownloadIcon from '@mui/icons-material/FileDownloadRounded';
import FileUploadIcon from '@mui/icons-material/FileUploadRounded';
import SearchIcon from '@mui/icons-material/SearchRounded';
import MeterDetailDialog from '../components/MeterDetailDialog';
import CreateMeterDialog from '../components/CreateMeterDialog';
import { useAuth } from '../context/AuthContext';
import { useDispatch, useSelector } from '../store';
import { getMeters } from '../slices/meter';
import { locationsApi } from '../api/locations';
import { categoriesApi } from '../api/categories';
import CustomDatagrid2 from '../components/CustomDatagrid2';
import useTableState from '../hooks/useTableState';
import type { ColumnDef } from '@tanstack/react-table';
import { assetsApi } from '../api/assets';
import type { CategorySummary, LocationSummary, MeterEntry } from '../types';
import { ApiRequestError } from '../api/client';

export default function MetersPage() {
  const { hasCreatePermission, hasDeleteOtherPermission } = useAuth();
  const tableState = useTableState({ prefix: 'meters' });

  // Copia fiel de las 8 columnas del listado real de Medidores.
  const columns: ColumnDef<MeterEntry>[] = [
    {
      accessorKey: 'name',
      header: 'Nombre',
      cell: (info) => <span style={{ fontWeight: 500 }}>{info.getValue() as string}</span>,
      size: 150,
    },
    {
      accessorKey: 'nextReadingDue',
      header: 'Próxima lectura pendiente',
      cell: (info) => {
        const m = info.row.original;
        // Tres estados en vez de dos: antes de la hora limite un medidor
        // sin leer esta PENDIENTE (el turno nocturno sigue trabajando);
        // despues pasa a INCUMPLIDO. Asi el supervisor distingue a las
        // 8 AM un turno que va normal de uno que fallo.
        if (m.readingStatus === 'INCUMPLIDO') {
          return <Chip label="No registrado" size="small" color="error" />;
        }
        if (m.readingStatus === 'PENDIENTE') {
          return <Chip label="Pendiente" size="small" color="warning" />;
        }
        return m.nextReadingDue ? new Date(m.nextReadingDue).toLocaleDateString() : '—';
      },
      size: 150,
    },
    { accessorKey: 'unit', header: 'Unidad de medida', cell: (info) => (info.getValue() as string) ?? '—', size: 150 },
    {
      accessorKey: 'lastReading',
      header: 'Última lectura',
      cell: (info) => {
        const v = info.getValue() as number | null;
        return v != null ? v : '—';
      },
      size: 150,
    },
    { accessorKey: 'locationName', header: 'Ubicación', cell: (info) => (info.getValue() as string) ?? '—', size: 150 },
    { accessorKey: 'assetName', header: 'Activo', cell: (info) => (info.getValue() as string) ?? '—', size: 150 },
    {
      accessorKey: 'createdByName',
      header: 'Creado por',
      cell: (info) => <span style={{ color: '#6b7590', fontSize: 12.5 }}>{(info.getValue() as string) ?? '—'}</span>,
      size: 150,
    },
    {
      accessorKey: 'createdAt',
      header: 'Fecha de creación',
      cell: (info) => (
        <span style={{ color: '#6b7590', fontSize: 12.5 }}>
          {new Date(info.getValue() as string).toLocaleDateString()}
        </span>
      ),
      size: 150,
    },
  ];
  // El listado vive en el store, igual que en Atlas.
  const dispatch = useDispatch();
  const { meters: metersPage, loadingGet } = useSelector((state) => state.meters);
  const meters = metersPage.content;
  const [error, setError] = useState<string | null>(null);
  const [selectedMeter, setSelectedMeter] = useState<MeterEntry | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [menuAnchor, setMenuAnchor] = useState<HTMLElement | null>(null);
  const [importing, setImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  // Con 200 medidores en dos plantas, el listado necesita filtros: por
  // texto, por planta, y "solo los que toca leer hoy".
  const [search, setSearch] = useState('');
  const [locationId, setLocationId] = useState('');
  const [pastDueOnly, setPastDueOnly] = useState(false);
  const [includeDisabled, setIncludeDisabled] = useState(false);
  const [locations, setLocations] = useState<LocationSummary[]>([]);
  // Categoria: separa "Agua Dulce" de "Agua Clarificada" dentro de cada planta.
  const [categoryId, setCategoryId] = useState('');
  const [categories, setCategories] = useState<CategorySummary[]>([]);
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(20);


  async function load() {
    setError(null);
    try {
      dispatch(getMeters({
        search: search.trim() || undefined,
        locationId: locationId ? Number(locationId) : undefined,
        categoryId: categoryId ? Number(categoryId) : undefined,
        pastDueOnly: pastDueOnly || undefined,
        includeDisabled: includeDisabled || undefined,
        page,
        size: pageSize,
      }));
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : 'No se pudieron cargar los medidores');
    }
  }

  // Carga las ubicaciones una vez, para el selector de planta.
  useEffect(() => {
    locationsApi.list().then(setLocations).catch(() => setLocations([]));
    categoriesApi.list('METER').then(setCategories).catch(() => setCategories([]));
  }, []);

  // Recarga al cambiar cualquier filtro. El texto espera 400 ms para no
  // disparar una consulta por cada letra.
  useEffect(() => {
    const t = setTimeout(load, search ? 400 : 0);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, locationId, categoryId, pastDueOnly, includeDisabled, page, pageSize]);

  async function handleImportFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setImporting(true);
    setError(null);
    try {
      const result = await assetsApi.importMetersCsv(file);
      load();
      if (result.failed > 0) {
        setError(`Se importaron ${result.created}, ${result.failed} filas fallaron (revisa el formato).`);
      }
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : 'No se pudo importar el archivo');
    } finally {
      setImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }

  return (
    <>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
          {meters.length} medidor{meters.length === 1 ? '' : 'es'}
        </Typography>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <IconButton onClick={(e) => setMenuAnchor(e.currentTarget)}>
            <MoreVertIcon />
          </IconButton>
          <Menu anchorEl={menuAnchor} open={!!menuAnchor} onClose={() => setMenuAnchor(null)}>
            <MenuItem
              onClick={() => {
                setMenuAnchor(null);
                assetsApi.exportMetersCsv();
              }}
            >
              <FileDownloadIcon fontSize="small" sx={{ mr: 1 }} /> Exportar medidores
            </MenuItem>
            <MenuItem
              onClick={() => {
                setMenuAnchor(null);
                assetsApi.exportMeterReadingsCsv();
              }}
            >
              <FileDownloadIcon fontSize="small" sx={{ mr: 1 }} /> Exportar lecturas
            </MenuItem>
            <MenuItem
              onClick={() => {
                setMenuAnchor(null);
                fileInputRef.current?.click();
              }}
              disabled={importing}
            >
              <FileUploadIcon fontSize="small" sx={{ mr: 1 }} /> {importing ? 'Importando…' : 'Importar'}
            </MenuItem>
          </Menu>
          <input ref={fileInputRef} type="file" accept=".csv" hidden onChange={handleImportFile} />
          {hasCreatePermission('METERS') && (
          <Button variant="contained" startIcon={<AddIcon />} onClick={() => setDialogOpen(true)}>
            Medidor
          </Button>
          )}
        </Box>
      </Box>

      {/* Barra de filtros: texto, planta y "solo los que toca leer hoy". */}
      <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 2, flexWrap: 'wrap' }}>
        <TextField
          size="small"
          placeholder="Buscar por medidor, activo o ubicación…"
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(0); }}
          InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment> }}
          sx={{ width: 320 }}
        />
        <TextField
          select
          size="small"
          label="Ubicación"
          value={locationId}
          onChange={(e) => { setLocationId(e.target.value); setPage(0); }}
          sx={{ width: 200 }}
        >
          <MenuItem value="">Todas</MenuItem>
          {locations.map((l) => (
            <MenuItem key={l.id} value={l.id}>
              {l.name}
            </MenuItem>
          ))}
        </TextField>
        <TextField
          select
          size="small"
          label="Tipo"
          value={categoryId}
          onChange={(e) => { setCategoryId(e.target.value); setPage(0); }}
          sx={{ width: 180 }}
        >
          <MenuItem value="">Todos</MenuItem>
          {categories.map((cat) => (
            <MenuItem key={cat.id} value={cat.id}>
              {cat.name}
            </MenuItem>
          ))}
        </TextField>
        <FormControlLabel
          control={
            <Switch
              checked={pastDueOnly}
              onChange={(e) => { setPastDueOnly(e.target.checked); setPage(0); }}
            />
          }
          label="Solo vencidos"
        />
        {/* Solo lo ve quien pueda deshabilitar medidores: para los demas
            los deshabilitados sencillamente no existen. */}
        {hasDeleteOtherPermission('METERS') && (
          <FormControlLabel
            control={
              <Switch
                checked={includeDisabled}
                onChange={(e) => { setIncludeDisabled(e.target.checked); setPage(0); }}
              />
            }
            label="Mostrar deshabilitados"
          />
        )}
        <Typography variant="body2" sx={{ color: 'text.secondary', ml: 'auto' }}>
          {metersPage.totalElements} medidor{metersPage.totalElements === 1 ? '' : 'es'}
        </Typography>
      </Stack>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {loadingGet ? (
        <Typography sx={{ color: 'text.secondary', textAlign: 'center', py: 6 }}>Cargando…</Typography>
      ) : meters.length === 0 ? (
        <Paper variant="outlined" sx={{ p: 6, textAlign: 'center' }}>
          <Typography sx={{ color: 'text.secondary' }}>
            {search || locationId || categoryId || pastDueOnly
              ? 'Ningún medidor coincide con los filtros.'
              : 'No hay medidores todavía. Crea el primero con el botón "Medidor" de arriba.'}
          </Typography>
        </Paper>
      ) : (
        <CustomDatagrid2
          columns={columns}
          data={meters}
          loading={loadingGet}
          pagination={{ pageIndex: page, pageSize }}
          onPaginationChange={(p) => { setPage(p.pageIndex); setPageSize(p.pageSize); }}
          totalRows={metersPage.totalElements}
          noRowsMessage="No hay medidores todavía. Crea el primero arriba."
          onRowClick={(row) => setSelectedMeter(row)}
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

      <CreateMeterDialog open={dialogOpen} onClose={() => setDialogOpen(false)} onSaved={load} />

      <MeterDetailDialog
        meter={selectedMeter}
        onClose={() => setSelectedMeter(null)}
        onChanged={() => {
          load();
          if (selectedMeter) {
            assetsApi.listAllMeters().then((all) => {
              const updated = all.find((x) => x.id === selectedMeter.id);
              if (updated) setSelectedMeter(updated);
            });
          }
        }}
      />
    </>
  );
}
