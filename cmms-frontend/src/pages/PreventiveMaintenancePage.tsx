import { useEffect, useRef, useState } from 'react';
import {
  Box,
  Typography,
  Button,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  TableContainer,
  Paper,
  Chip,
  Alert,
  Switch,
} from '@mui/material';
import AddIcon from '@mui/icons-material/AddRounded';
import FileDownloadIcon from '@mui/icons-material/FileDownloadRounded';
import FileUploadIcon from '@mui/icons-material/FileUploadRounded';
import CreatePMDialog from '../components/CreatePMDialog';
import PMDetailDrawer from '../components/PMDetailDrawer';
import WorkOrderDetailDrawer from '../components/WorkOrderDetailDrawer';
import { useAuth } from '../context/AuthContext';
import { useDispatch, useSelector } from '../store';
import { getPreventiveMaintenances } from '../slices/preventiveMaintenance';
import { preventiveMaintenanceApi } from '../api/preventiveMaintenance';
import { workOrdersApi } from '../api/workOrders';
import type { PreventiveMaintenance, WorkOrder } from '../types';
import { ApiRequestError } from '../api/client';
import { PRIORITY_COLORS, PRIORITY_LABELS } from '../constants';

export default function PreventiveMaintenancePage() {
  const { hasCreatePermission } = useAuth();
  const dispatch = useDispatch();
  const { preventiveMaintenances, loadingGet } = useSelector((state) => state.preventiveMaintenances);
  const items = preventiveMaintenances.content;
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingPM, setEditingPM] = useState<PreventiveMaintenance | null>(null);
  const [selectedPM, setSelectedPM] = useState<PreventiveMaintenance | null>(null);
  const [selectedWorkOrder, setSelectedWorkOrder] = useState<WorkOrder | null>(null);
  const [importing, setImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      dispatch(getPreventiveMaintenances());
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : 'No se pudo cargar el mantenimiento preventivo');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function handleToggleEnabled(pm: PreventiveMaintenance, e: React.SyntheticEvent) {
    e.stopPropagation();
    try {
      await preventiveMaintenanceApi.setEnabled(pm.id, pm.schedule.disabled);
      load();
    } catch {
      // silencioso
    }
  }

  async function handleSelectWorkOrder(id: number) {
    try {
      setSelectedWorkOrder(await workOrdersApi.getById(id));
    } catch {
      // silencioso
    }
  }

  async function handleImportFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setImporting(true);
    setError(null);
    try {
      const result = await preventiveMaintenanceApi.importCsv(file);
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
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 3 }}>
        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
          {items.length} programa{items.length === 1 ? '' : 's'} de mantenimiento preventivo
        </Typography>
        {hasCreatePermission('PREVENTIVE_MAINTENANCES') && (
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => setDialogOpen(true)}>
          Mantenimiento Preventivo
        </Button>
        )}
      </Box>

      <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
        <Button size="small" startIcon={<FileDownloadIcon />} onClick={() => preventiveMaintenanceApi.exportCsv()}>
          Exportar CSV
        </Button>
        <Button size="small" startIcon={<FileUploadIcon />} onClick={() => fileInputRef.current?.click()} disabled={importing}>
          {importing ? 'Importando…' : 'Importar CSV'}
        </Button>
        <input ref={fileInputRef} type="file" accept=".csv" hidden onChange={handleImportFile} />
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {loading ? (
        <Typography sx={{ color: 'text.secondary', textAlign: 'center', py: 6 }}>Cargando…</Typography>
      ) : items.length === 0 ? (
        <Paper variant="outlined" sx={{ p: 6, textAlign: 'center' }}>
          <Typography sx={{ color: 'text.secondary' }}>
            No hay mantenimientos preventivos todavía. Crea el primero arriba — generará órdenes de trabajo
            automáticamente según la recurrencia que definas.
          </Typography>
        </Paper>
      ) : (
        <TableContainer component={Paper} variant="outlined">
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>ID</TableCell>
                <TableCell>Título</TableCell>
                <TableCell>Prioridad</TableCell>
                <TableCell>Descripción</TableCell>
                <TableCell>Ubicación</TableCell>
                <TableCell>Categoría</TableCell>
                <TableCell>Próxima generación</TableCell>
                <TableCell align="center">Habilitado</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {items.map((pm) => (
                <TableRow key={pm.id} hover onClick={() => setSelectedPM(pm)} sx={{ cursor: 'pointer' }}>
                  <TableCell sx={{ color: 'text.secondary', fontFamily: 'monospace', fontSize: 12.5 }}>
                    {pm.customId}
                  </TableCell>
                  <TableCell sx={{ fontWeight: 500 }}>{pm.title}</TableCell>
                  <TableCell>
                    <Chip
                      label={PRIORITY_LABELS[pm.priority]}
                      size="small"
                      sx={{ bgcolor: PRIORITY_COLORS[pm.priority].bg, color: PRIORITY_COLORS[pm.priority].text }}
                    />
                  </TableCell>
                  <TableCell sx={{ maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {pm.description ?? '—'}
                  </TableCell>
                  <TableCell>{pm.locationName ?? '—'}</TableCell>
                  <TableCell>{pm.categoryName ?? '—'}</TableCell>
                  <TableCell sx={{ fontSize: 12.5 }}>
                    {pm.schedule.disabled ? '—' : pm.nextDueAt ? new Date(pm.nextDueAt).toLocaleString() : '—'}
                  </TableCell>
                  <TableCell align="center" onClick={(e) => e.stopPropagation()}>
                    <Switch size="small" checked={!pm.schedule.disabled} onChange={(e) => handleToggleEnabled(pm, e)} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      <CreatePMDialog
        open={dialogOpen}
        editPM={editingPM}
        onClose={() => {
          setDialogOpen(false);
          setEditingPM(null);
        }}
        onSaved={load}
      />

      <PMDetailDrawer
        pm={selectedPM}
        onClose={() => setSelectedPM(null)}
        onChanged={load}
        onEdit={(pm) => {
          setSelectedPM(null);
          setEditingPM(pm);
          setDialogOpen(true);
        }}
        onSelectWorkOrder={handleSelectWorkOrder}
      />

      <WorkOrderDetailDrawer
        workOrder={selectedWorkOrder}
        onClose={() => setSelectedWorkOrder(null)}
        onChanged={() => {
          if (selectedWorkOrder) {
            workOrdersApi.getById(selectedWorkOrder.id).then(setSelectedWorkOrder).catch(() => {});
          }
        }}
      />
    </>
  );
}
