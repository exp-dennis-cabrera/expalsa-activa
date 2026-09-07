import { useEffect, useState } from 'react';
import {
  Drawer,
  Box,
  Typography,
  IconButton,
  Switch,
  Button,
  Chip,
  Divider,
  Grid,
  Alert,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBackRounded';
import EditTwoToneIcon from '@mui/icons-material/EditTwoTone';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutlineRounded';
import PlayArrowIcon from '@mui/icons-material/PlayArrowRounded';
import { preventiveMaintenanceApi } from '../api/preventiveMaintenance';
import type { PreventiveMaintenance, WorkOrder } from '../types';
import { ApiRequestError } from '../api/client';
import ConfirmDialog from './ConfirmDialog';
import { PRIORITY_COLORS, PRIORITY_LABELS, STATUS_LABELS, RECURRENCE_TYPE_LABELS, RECURRENCE_BASED_ON_LABELS, WEEKDAY_LABELS_SHORT } from '../constants';
import TaskChecklist from './TaskChecklist';
import CustomFieldValues from './CustomFieldValues';

interface Props {
  pm: PreventiveMaintenance | null;
  onClose: () => void;
  onChanged: () => void;
  onEdit: (pm: PreventiveMaintenance) => void;
  onSelectWorkOrder: (id: number) => void;
}

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <Grid item xs={6}>
      <Typography variant="caption" sx={{ color: 'text.secondary' }}>
        {label}
      </Typography>
      <Typography variant="body2" sx={{ fontWeight: 500 }}>
        {value ?? '—'}
      </Typography>
    </Grid>
  );
}

export default function PMDetailDrawer({ pm, onClose, onChanged, onEdit, onSelectWorkOrder }: Props) {
  const [history, setHistory] = useState<WorkOrder[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmState, setConfirmState] = useState<{ question: string; confirmText: string; onConfirm: () => void } | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!pm) return;
    setLoadingHistory(true);
    preventiveMaintenanceApi
      .getWorkOrderHistory(pm.id)
      .then(setHistory)
      .catch(() => setHistory([]))
      .finally(() => setLoadingHistory(false));
  }, [pm]);

  async function handleToggleEnabled() {
    if (!pm) return;
    setBusy(true);
    setError(null);
    try {
      await preventiveMaintenanceApi.setEnabled(pm.id, pm.schedule.disabled);
      onChanged();
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : 'No se pudo cambiar el estado');
    } finally {
      setBusy(false);
    }
  }

  async function handleGenerateNow() {
    if (!pm) return;
    setBusy(true);
    setError(null);
    try {
      await preventiveMaintenanceApi.generateNow(pm.id);
      onChanged();
      preventiveMaintenanceApi.getWorkOrderHistory(pm.id).then(setHistory).catch(() => {});
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : 'No se pudo generar la orden');
    } finally {
      setBusy(false);
    }
  }

  function handleDelete() {
    if (!pm) return;
    setConfirmState({
      question: `¿Eliminar "${pm.name}"? Esto no borra las órdenes ya generadas.`,
      confirmText: 'Borrar',
      onConfirm: () => doDelete(),
    });
  }

  async function doDelete() {
    if (!pm) return;
    setBusy(true);
    try {
      await preventiveMaintenanceApi.delete(pm.id);
      onChanged();
      onClose();
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : 'No se pudo eliminar');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Drawer anchor="right" open={!!pm} onClose={onClose} PaperProps={{ sx: { width: { xs: '90%', sm: '70%', md: '50%' } } }}>
      {pm && (
        <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', p: 2, borderBottom: '1px solid', borderColor: 'divider' }}>
            <IconButton size="small" onClick={onClose} sx={{ ml: -1 }}>
              <ArrowBackIcon fontSize="small" />
            </IconButton>
            <Box>
              <IconButton size="small" onClick={() => onEdit(pm)} sx={{ color: 'primary.main' }}>
                <EditTwoToneIcon fontSize="small" />
              </IconButton>
              <IconButton size="small" onClick={handleDelete} disabled={busy} sx={{ color: 'error.main' }}>
                <DeleteOutlineIcon fontSize="small" />
              </IconButton>
            </Box>
          </Box>

          <Box sx={{ p: 3, flex: 1, overflowY: 'auto' }}>
            {pm.priority !== 'NONE' && (
              <Chip
                label={PRIORITY_LABELS[pm.priority]}
                size="small"
                sx={{ mb: 1, bgcolor: PRIORITY_COLORS[pm.priority].bg, color: PRIORITY_COLORS[pm.priority].text }}
              />
            )}
            <Typography variant="h5" sx={{ fontWeight: 700 }}>
              {pm.name}
            </Typography>
            {pm.description && (
              <Typography variant="body2" sx={{ color: 'text.secondary', mt: 0.5 }}>
                {pm.description}
              </Typography>
            )}

            {error && (
              <Alert severity="error" sx={{ mt: 2 }} onClose={() => setError(null)}>
                {error}
              </Alert>
            )}

            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mt: 2.5, mb: 1 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <Switch checked={!pm.schedule.disabled} onChange={handleToggleEnabled} disabled={busy} />
                <Typography variant="body2">{pm.schedule.disabled ? 'Deshabilitado' : 'Habilitado'}</Typography>
              </Box>
              <Button variant="outlined" size="small" startIcon={<PlayArrowIcon />} onClick={handleGenerateNow} disabled={busy}>
                Generar orden ahora
              </Button>
            </Box>

            <Divider sx={{ my: 2 }} />

            <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1.5 }}>
              Recurrencia
            </Typography>
            <Grid container spacing={2} sx={{ mb: 2 }}>
              <Field label="Tipo" value={RECURRENCE_TYPE_LABELS[pm.schedule.recurrenceType]} />
              <Field label="Cada" value={`${pm.schedule.frequency} ${pm.schedule.recurrenceType === 'DAILY' ? 'día(s)' : pm.schedule.recurrenceType === 'WEEKLY' ? 'semana(s)' : pm.schedule.recurrenceType === 'MONTHLY' ? 'mes(es)' : 'año(s)'}`} />
              <Field label="Basado en" value={RECURRENCE_BASED_ON_LABELS[pm.schedule.recurrenceBasedOn]} />
              <Field
                label="Días de la semana"
                value={
                  pm.schedule.recurrenceType === 'WEEKLY' && pm.schedule.daysOfWeek.length > 0
                    ? pm.schedule.daysOfWeek.map((d) => WEEKDAY_LABELS_SHORT[d]).join(', ')
                    : '—'
                }
              />
              <Field label="Empieza el" value={new Date(pm.schedule.startsOn).toLocaleString()} />
              <Field label="Termina el" value={pm.schedule.endsOn ? new Date(pm.schedule.endsOn).toLocaleString() : 'Nunca'} />
              <Field label="Última generada" value={pm.lastGeneratedAt ? new Date(pm.lastGeneratedAt).toLocaleString() : 'Todavía no'} />
              <Field label="Próxima generación" value={pm.nextDueAt ? new Date(pm.nextDueAt).toLocaleString() : '—'} />
            </Grid>

            <Divider sx={{ my: 2 }} />

            <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1.5 }}>
              Detalles
            </Typography>
            <Grid container spacing={2} sx={{ mb: 2 }}>
              <Field label="ID" value={pm.customId} />
            <Field label="Título de la orden generada" value={pm.title} />
              <Field label="Categoría" value={pm.categoryName} />
              <Field label="Ubicación" value={pm.locationName} />
              <Field label="Activo" value={pm.assetName} />
              <Field label="Equipo" value={pm.teamName} />
              <Field label="Trabajador principal" value={pm.primaryAssigneeName} />
              <Field label="Duración estimada" value={pm.estimatedDurationMinutes ? `${(pm.estimatedDurationMinutes / 60).toFixed(1)} horas` : '—'} />
            </Grid>

            <Divider sx={{ my: 2 }} />

            <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1.5 }}>
              Tareas (se copian a cada orden generada)
            </Typography>
            <TaskChecklist entityType="preventive-maintenances" entityId={pm.id} isTemplate />

            <Divider sx={{ my: 2 }} />
            <CustomFieldValues entityType="PREVENTIVE_MAINTENANCE" targetType="pm" entityId={pm.id} />

            <Divider sx={{ my: 2 }} />

            <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1.5 }}>
              Órdenes generadas ({history.length})
            </Typography>
            {loadingHistory ? (
              <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                Cargando…
              </Typography>
            ) : history.length === 0 ? (
              <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                Todavía no se ha generado ninguna orden.
              </Typography>
            ) : (
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>ID</TableCell>
                    <TableCell>Estado</TableCell>
                    <TableCell>Creada</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {history.map((wo) => (
                    <TableRow key={wo.id} hover onClick={() => onSelectWorkOrder(wo.id)} sx={{ cursor: 'pointer' }}>
                      <TableCell sx={{ fontFamily: 'monospace', fontSize: 12.5 }}>WO{String(wo.id).padStart(6, '0')}</TableCell>
                      <TableCell>
                        <Chip label={STATUS_LABELS[wo.status]} size="small" variant="outlined" />
                      </TableCell>
                      <TableCell sx={{ fontSize: 12.5 }}>{new Date(wo.createdAt).toLocaleDateString()}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </Box>
        </Box>
      )}

      <ConfirmDialog
        open={!!confirmState}
        onCancel={() => setConfirmState(null)}
        onConfirm={() => {
          confirmState?.onConfirm();
          setConfirmState(null);
        }}
        confirmText={confirmState?.confirmText ?? 'Borrar'}
        question={confirmState?.question ?? ''}
      />
    </Drawer>
  );
}
