import { useEffect, useState } from 'react';
import { Box, Typography, Button, TextField, IconButton, Stack } from '@mui/material';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutlineRounded';
import { workOrderExtrasApi } from '../api/workOrderExtras';
import type { AdditionalCostEntry } from '../types';
import { ApiRequestError } from '../api/client';
import { canDeleteWorkOrder } from '../constants';
import { useAuth } from '../context/AuthContext';

export default function WorkOrderCostsSection({ workOrderId }: { workOrderId: number }) {
  const { role } = useAuth();
  const canDelete = canDeleteWorkOrder(role);

  const [costs, setCosts] = useState<AdditionalCostEntry[]>([]);
  const [description, setDescription] = useState('');
  const [cost, setCost] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    try {
      setCosts(await workOrderExtrasApi.listCosts(workOrderId));
    } catch {
      setCosts([]);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workOrderId]);

  async function handleAdd() {
    const c = Number(cost);
    if (!description.trim() || Number.isNaN(c)) return;
    setError(null);
    try {
      await workOrderExtrasApi.addCost(workOrderId, description.trim(), c);
      setDescription('');
      setCost('');
      setShowForm(false);
      load();
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : 'No se pudo agregar el costo');
    }
  }

  async function handleDelete(costId: number) {
    try {
      await workOrderExtrasApi.deleteCost(workOrderId, costId);
      load();
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : 'No se pudo eliminar');
    }
  }

  const total = costs.reduce((sum, c) => sum + c.cost, 0);

  return (
    <Box sx={{ mt: 2.5 }}>
      <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 0.5 }}>
        Costos adicionales
      </Typography>

      {costs.length === 0 && !showForm && (
        <Typography variant="body2" sx={{ color: 'text.secondary', mb: 1 }}>
          Costos adicionales no han sido agregados aún.
        </Typography>
      )}

      {costs.map((c) => (
        <Stack key={c.id} direction="row" alignItems="center" justifyContent="space-between" sx={{ py: 0.5 }}>
          <Typography variant="body2">
            {c.description} — ${c.cost.toFixed(2)}
          </Typography>
          {canDelete && (
            <IconButton size="small" onClick={() => handleDelete(c.id)}>
              <DeleteOutlineIcon fontSize="small" sx={{ color: 'error.main' }} />
            </IconButton>
          )}
        </Stack>
      ))}

      {costs.length > 0 && (
        <Typography variant="body2" sx={{ fontWeight: 700, mt: 0.5 }}>
          Total: ${total.toFixed(2)}
        </Typography>
      )}

      {error && (
        <Typography variant="caption" sx={{ color: 'error.main', display: 'block', mt: 0.5 }}>
          {error}
        </Typography>
      )}

      {showForm ? (
        <Stack spacing={1} sx={{ mt: 1 }}>
          <TextField
            size="small"
            label="Descripción"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
          <TextField
            size="small"
            type="number"
            label="Costo"
            value={cost}
            onChange={(e) => setCost(e.target.value)}
            inputProps={{ min: 0, step: 0.01 }}
          />
          <Stack direction="row" spacing={1}>
            <Button size="small" variant="contained" onClick={handleAdd}>
              Guardar
            </Button>
            <Button size="small" onClick={() => setShowForm(false)}>
              Cancelar
            </Button>
          </Stack>
        </Stack>
      ) : (
        <Button size="small" variant="outlined" sx={{ mt: 1 }} onClick={() => setShowForm(true)}>
          Agregar costo adicional
        </Button>
      )}
    </Box>
  );
}
