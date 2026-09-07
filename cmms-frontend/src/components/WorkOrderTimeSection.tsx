import { useState } from 'react';
import { Box, Typography, Button, TextField, IconButton, Stack, Dialog, DialogTitle, DialogContent, DialogActions } from '@mui/material';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutlineRounded';
import EditTwoToneIcon from '@mui/icons-material/EditTwoTone';
import { workOrderExtrasApi } from '../api/workOrderExtras';
import type { TimeLogEntry } from '../types';
import { ApiRequestError } from '../api/client';
import { canDeleteWorkOrder } from '../constants';
import { useAuth } from '../context/AuthContext';

interface Props {
  workOrderId: number;
  timeLogs: TimeLogEntry[];
  onReload: () => void;
}

export default function WorkOrderTimeSection({ workOrderId, timeLogs, onReload }: Props) {
  const { role } = useAuth();
  const canDelete = canDeleteWorkOrder(role);

  const [hours, setHours] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editingLog, setEditingLog] = useState<TimeLogEntry | null>(null);
  const [editHours, setEditHours] = useState('');
  const [savingEdit, setSavingEdit] = useState(false);

  async function handleAdd() {
    const h = Number(hours);
    if (!h || h <= 0) return;
    setError(null);
    try {
      await workOrderExtrasApi.addTimeLog(workOrderId, h);
      setHours('');
      setShowForm(false);
      onReload();
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : 'No se pudo agregar el tiempo');
    }
  }

  async function handleDelete(logId: number) {
    try {
      await workOrderExtrasApi.deleteTimeLog(workOrderId, logId);
      onReload();
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : 'No se pudo eliminar');
    }
  }

  const totalHours = timeLogs.reduce((sum, l) => sum + (l.hours ?? 0), 0);
  const totalCost = timeLogs.reduce((sum, l) => sum + (l.cost ?? 0), 0);

  return (
    <Box sx={{ mt: 2.5 }}>
      <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 0.5 }}>
        Tareas
      </Typography>

      {timeLogs.length === 0 && !showForm && (
        <Typography variant="body2" sx={{ color: 'text.secondary', mb: 1 }}>
          Aún no se han agregado costos. Aparecerán aquí cuando un usuario registre su tiempo.
        </Typography>
      )}

      {timeLogs.map((log) => (
        <Stack key={log.id} direction="row" alignItems="center" justifyContent="space-between" sx={{ py: 0.5 }}>
          <Typography variant="body2">
            {log.userName} —{' '}
            {log.running
              ? 'timer corriendo…'
              : `${log.hours}h ${log.cost != null ? `($${log.cost.toFixed(2)})` : ''}`}
          </Typography>
          <Stack direction="row">
            {/* Igual que editLabor real: corregir las horas sin borrar el
                registro -- util cuando alguien deja el cronómetro corriendo. */}
            {!log.running && (
              <IconButton size="small" onClick={() => { setEditingLog(log); setEditHours(String(log.hours ?? 0)); }}>
                <EditTwoToneIcon fontSize="small" color="primary" />
              </IconButton>
            )}
            {canDelete && !log.running && (
              <IconButton size="small" onClick={() => handleDelete(log.id)}>
                <DeleteOutlineIcon fontSize="small" sx={{ color: 'error.main' }} />
              </IconButton>
            )}
          </Stack>
        </Stack>
      ))}

      {timeLogs.length > 0 && (
        <Typography variant="body2" sx={{ fontWeight: 700, mt: 0.5 }}>
          Total: {totalHours.toFixed(2)}h {totalCost > 0 ? `— $${totalCost.toFixed(2)}` : ''}
        </Typography>
      )}

      {error && (
        <Typography variant="caption" sx={{ color: 'error.main', display: 'block', mt: 0.5 }}>
          {error}
        </Typography>
      )}

      {showForm ? (
        <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
          <TextField
            size="small"
            type="number"
            label="Horas"
            value={hours}
            onChange={(e) => setHours(e.target.value)}
            inputProps={{ min: 0, step: 0.5 }}
            sx={{ width: 120 }}
          />
          <Button size="small" variant="contained" onClick={handleAdd}>
            Guardar
          </Button>
          <Button size="small" onClick={() => setShowForm(false)}>
            Cancelar
          </Button>
        </Stack>
      ) : (
        <Button size="small" variant="outlined" sx={{ mt: 1 }} onClick={() => setShowForm(true)}>
          Agregar tiempo
        </Button>
      )}

      {/* Igual que el modal de editar tiempo primario real. */}
      <Dialog open={!!editingLog} onClose={() => setEditingLog(null)} maxWidth="xs" fullWidth>
        <DialogTitle>Corregir tiempo registrado</DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          <TextField
            label="Horas"
            type="number"
            value={editHours}
            onChange={(e) => setEditHours(e.target.value)}
            inputProps={{ min: 0, step: 0.25 }}
            fullWidth
            autoFocus
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditingLog(null)}>Cancelar</Button>
          <Button
            variant="contained"
            disabled={savingEdit || !editHours}
            onClick={async () => {
              if (!editingLog) return;
              setSavingEdit(true);
              try {
                await workOrderExtrasApi.updateTimeLog(workOrderId, editingLog.id, Number(editHours));
                setEditingLog(null);
                onReload();
              } catch (err) {
                setError(err instanceof ApiRequestError ? err.message : 'No se pudo corregir el tiempo');
              } finally {
                setSavingEdit(false);
              }
            }}
          >
            {savingEdit ? 'Guardando…' : 'Guardar'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
