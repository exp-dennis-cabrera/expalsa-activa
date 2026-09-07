import { useEffect, useState } from 'react';
import { Box, Typography, Button, TextField, MenuItem, IconButton, Stack } from '@mui/material';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutlineRounded';
import { workOrderExtrasApi } from '../api/workOrderExtras';
import { partsApi } from '../api/parts';
import type { PartSummary, WorkOrderPartEntry } from '../types';
import { ApiRequestError } from '../api/client';
import { canDeleteWorkOrder } from '../constants';
import { useAuth } from '../context/AuthContext';

export default function WorkOrderPartsSection({ workOrderId }: { workOrderId: number }) {
  const { role } = useAuth();
  const canDelete = canDeleteWorkOrder(role);

  const [usedParts, setUsedParts] = useState<WorkOrderPartEntry[]>([]);
  const [catalog, setCatalog] = useState<PartSummary[]>([]);
  const [partId, setPartId] = useState('');
  const [quantity, setQuantity] = useState('1');
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    try {
      setUsedParts(await workOrderExtrasApi.listParts(workOrderId));
    } catch {
      setUsedParts([]);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workOrderId]);

  useEffect(() => {
    if (showForm) {
      partsApi.list().then(setCatalog).catch(() => setCatalog([]));
    }
  }, [showForm]);

  async function handleAdd() {
    const qty = Number(quantity);
    if (!partId || !qty || qty <= 0) return;
    setError(null);
    try {
      await workOrderExtrasApi.addPart(workOrderId, Number(partId), qty);
      setPartId('');
      setQuantity('1');
      setShowForm(false);
      load();
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : 'No se pudo agregar el repuesto');
    }
  }

  async function handleDelete(workOrderPartId: number) {
    try {
      await workOrderExtrasApi.removePart(workOrderId, workOrderPartId);
      load();
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : 'No se pudo quitar el repuesto');
    }
  }

  const total = usedParts.reduce((sum, p) => sum + (p.totalCost ?? 0), 0);

  return (
    <Box sx={{ mt: 2.5 }}>
      <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 0.5 }}>
        Repuestos
      </Typography>

      {usedParts.map((p) => (
        <Stack key={p.id} direction="row" alignItems="center" justifyContent="space-between" sx={{ py: 0.5 }}>
          <Typography variant="body2">
            {p.partName} × {p.quantityUsed}
            {p.totalCost != null ? ` — $${p.totalCost.toFixed(2)}` : ''}
          </Typography>
          {canDelete && (
            <IconButton size="small" onClick={() => handleDelete(p.id)}>
              <DeleteOutlineIcon fontSize="small" sx={{ color: 'error.main' }} />
            </IconButton>
          )}
        </Stack>
      ))}

      <Stack direction="row" justifyContent="space-between" sx={{ mt: 0.5 }}>
        <Typography variant="body2" sx={{ fontWeight: 700 }}>
          Total
        </Typography>
        <Typography variant="body2" sx={{ fontWeight: 700 }}>
          ${total.toFixed(2)}
        </Typography>
      </Stack>

      {error && (
        <Typography variant="caption" sx={{ color: 'error.main', display: 'block', mt: 0.5 }}>
          {error}
        </Typography>
      )}

      {showForm ? (
        <Stack spacing={1} sx={{ mt: 1 }}>
          <TextField select size="small" label="Repuesto" value={partId} onChange={(e) => setPartId(e.target.value)}>
            {catalog.map((p) => (
              <MenuItem key={p.id} value={p.id}>
                {p.name} (stock: {p.quantity})
              </MenuItem>
            ))}
          </TextField>
          <TextField
            size="small"
            type="number"
            label="Cantidad"
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            inputProps={{ min: 1 }}
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
          + Agregar repuesto
        </Button>
      )}
    </Box>
  );
}
