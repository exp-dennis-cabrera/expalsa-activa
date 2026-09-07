import { useEffect, useState } from 'react';
import { Box, Typography, Button, TextField, MenuItem, IconButton, Stack, Chip } from '@mui/material';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutlineRounded';
import { workOrderExtrasApi } from '../api/workOrderExtras';
import { workOrdersApi } from '../api/workOrders';
import type { WorkOrder, WorkOrderLink } from '../types';
import { ApiRequestError } from '../api/client';
import { STATUS_LABELS } from '../constants';

export default function WorkOrderLinksSection({ workOrderId }: { workOrderId: number }) {
  const [links, setLinks] = useState<WorkOrderLink[]>([]);
  const [candidates, setCandidates] = useState<WorkOrder[]>([]);
  const [selectedId, setSelectedId] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    try {
      setLinks(await workOrderExtrasApi.listLinks(workOrderId));
    } catch {
      setLinks([]);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workOrderId]);

  useEffect(() => {
    if (showForm) {
      workOrdersApi.list({ size: 100 }).then((r) => setCandidates(r.content.filter((w) => w.id !== workOrderId)));
    }
  }, [showForm, workOrderId]);

  async function handleAdd() {
    if (!selectedId) return;
    setError(null);
    try {
      await workOrderExtrasApi.addLink(workOrderId, Number(selectedId));
      setSelectedId('');
      setShowForm(false);
      load();
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : 'No se pudo vincular la orden');
    }
  }

  async function handleRemove(linkId: number) {
    try {
      await workOrderExtrasApi.removeLink(workOrderId, linkId);
      load();
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : 'No se pudo quitar el vínculo');
    }
  }

  return (
    <Box sx={{ mt: 2.5 }}>
      <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 0.5 }}>
        Vínculos
      </Typography>

      {links.length === 0 && !showForm && (
        <Typography variant="body2" sx={{ color: 'text.secondary', mb: 1 }}>
          Esta orden no tiene órdenes vinculadas.
        </Typography>
      )}

      {links.map((l) => (
        <Stack key={l.linkId} direction="row" alignItems="center" justifyContent="space-between" sx={{ py: 0.5 }}>
          <Stack direction="row" alignItems="center" spacing={1}>
            <Typography variant="body2">
              WO{String(l.workOrderId).padStart(6, '0')} — {l.title}
            </Typography>
            <Chip label={STATUS_LABELS[l.status]} size="small" variant="outlined" />
          </Stack>
          <IconButton size="small" onClick={() => handleRemove(l.linkId)}>
            <DeleteOutlineIcon fontSize="small" sx={{ color: 'error.main' }} />
          </IconButton>
        </Stack>
      ))}

      {error && (
        <Typography variant="caption" sx={{ color: 'error.main', display: 'block', mt: 0.5 }}>
          {error}
        </Typography>
      )}

      {showForm ? (
        <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
          <TextField
            select
            size="small"
            fullWidth
            label="Orden a vincular"
            value={selectedId}
            onChange={(e) => setSelectedId(e.target.value)}
          >
            {candidates.map((w) => (
              <MenuItem key={w.id} value={w.id}>
                WO{String(w.id).padStart(6, '0')} — {w.title}
              </MenuItem>
            ))}
          </TextField>
          <Button size="small" variant="contained" onClick={handleAdd}>
            Vincular
          </Button>
        </Stack>
      ) : (
        <Button size="small" variant="outlined" sx={{ mt: 1 }} onClick={() => setShowForm(true)}>
          Vincular Órdenes de Trabajo
        </Button>
      )}
    </Box>
  );
}
