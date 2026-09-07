import { useEffect, useState } from 'react';
import {
  Box,
  Typography,
  Button,
  Chip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  Alert,
  List,
  ListItem,
  ListItemText,
  Stack,
} from '@mui/material';
import AddIcon from '@mui/icons-material/AddRounded';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutlineRounded';
import CheckCircleIcon from '@mui/icons-material/CheckCircleRounded';
import CancelIcon from '@mui/icons-material/CancelRounded';
import { materialRequestsApi } from '../api/materialRequests';
import { partsApi } from '../api/parts';
import type { MaterialRequest, PartSummary } from '../types';
import { ApiRequestError } from '../api/client';
import { MATERIAL_REQUEST_STATUS_LABELS, MATERIAL_REQUEST_STATUS_COLORS } from '../constants';
import { useAuth } from '../context/AuthContext';

interface Props {
  workOrderId: number;
}

interface DraftItem {
  partId: string;
  quantity: string;
}

export default function WorkOrderMaterialRequestsSection({ workOrderId }: Props) {
  const { role } = useAuth();
  const canDecide = role === 'ADMIN' || role === 'LIMITED_ADMIN';

  const [requests, setRequests] = useState<MaterialRequest[]>([]);
  const [parts, setParts] = useState<PartSummary[]>([]);
  const [error, setError] = useState<string | null>(null);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [notes, setNotes] = useState('');
  const [draftItems, setDraftItems] = useState<DraftItem[]>([{ partId: '', quantity: '1' }]);
  const [submitting, setSubmitting] = useState(false);

  const [rejectingId, setRejectingId] = useState<number | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');

  async function load() {
    try {
      setRequests(await materialRequestsApi.listForWorkOrder(workOrderId));
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : 'No se pudieron cargar las solicitudes de materiales');
    }
  }

  useEffect(() => {
    load();
    partsApi.list().then(setParts).catch(() => setParts([]));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workOrderId]);

  function openDialog() {
    setNotes('');
    setDraftItems([{ partId: '', quantity: '1' }]);
    setDialogOpen(true);
  }

  function updateItem(index: number, field: keyof DraftItem, value: string) {
    setDraftItems((prev) => prev.map((it, i) => (i === index ? { ...it, [field]: value } : it)));
  }

  function addItemRow() {
    setDraftItems((prev) => [...prev, { partId: '', quantity: '1' }]);
  }

  function removeItemRow(index: number) {
    setDraftItems((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleSubmit() {
    const items = draftItems
      .filter((it) => it.partId && Number(it.quantity) > 0)
      .map((it) => ({ partId: Number(it.partId), quantity: Number(it.quantity) }));
    if (items.length === 0) return;
    setSubmitting(true);
    setError(null);
    try {
      await materialRequestsApi.create(workOrderId, items, notes.trim() || undefined);
      setDialogOpen(false);
      load();
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : 'No se pudo crear la solicitud');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleApprove(id: number) {
    try {
      await materialRequestsApi.decide(id, 'APPROVED');
      load();
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : 'No se pudo aprobar la solicitud');
    }
  }

  async function handleReject() {
    if (rejectingId == null || !rejectionReason.trim()) return;
    try {
      await materialRequestsApi.decide(rejectingId, 'REJECTED', { rejectionReason: rejectionReason.trim() });
      setRejectingId(null);
      setRejectionReason('');
      load();
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : 'No se pudo rechazar la solicitud');
    }
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
        <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
          Solicitud de materiales
        </Typography>
        <Button size="small" startIcon={<AddIcon />} onClick={openDialog}>
          Nueva solicitud
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 1.5 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {requests.length === 0 ? (
        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
          Sin solicitudes de materiales todavía.
        </Typography>
      ) : (
        requests.map((r) => (
          <Box key={r.id} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 1.5, p: 1.5, mb: 1.5 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
              <Chip label={MATERIAL_REQUEST_STATUS_LABELS[r.status]} size="small" color={MATERIAL_REQUEST_STATUS_COLORS[r.status]} />
              <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                {r.requestedByName ?? '—'} · {new Date(r.createdAt).toLocaleDateString()}
              </Typography>
            </Box>
            <List dense disablePadding>
              {r.items.map((it) => (
                <ListItem key={it.id} disablePadding sx={{ py: 0.25 }}>
                  <ListItemText
                    primary={`${it.partName}${it.partErpSku ? ` (${it.partErpSku})` : ''} — pedidas ${it.requestedQuantity}${it.approvedQuantity != null ? `, aprobadas ${it.approvedQuantity}` : ''}`}
                  />
                </ListItem>
              ))}
            </List>
            {r.notes && (
              <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mt: 0.5 }}>
                Nota: {r.notes}
              </Typography>
            )}
            {r.status === 'REJECTED' && r.rejectionReason && (
              <Alert severity="error" sx={{ mt: 1 }}>
                Motivo: {r.rejectionReason}
              </Alert>
            )}
            {r.status === 'APPROVED' && (
              <Alert severity="success" sx={{ mt: 1 }}>
                Aprobada — ya se puede retirar de bodega.
              </Alert>
            )}
            {r.status === 'PENDING' && canDecide && (
              <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
                <Button size="small" variant="contained" color="success" startIcon={<CheckCircleIcon />} onClick={() => handleApprove(r.id)}>
                  Aprobar
                </Button>
                <Button size="small" variant="outlined" color="error" startIcon={<CancelIcon />} onClick={() => setRejectingId(r.id)}>
                  Rechazar
                </Button>
              </Stack>
            )}
          </Box>
        ))
      )}

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ pb: 0.5 }}>
          Nueva solicitud de materiales
          <Typography variant="body2" sx={{ color: 'text.secondary', fontWeight: 400, mt: 0.5 }}>
            Se envía a bodega para aprobación
          </Typography>
        </DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, pt: 2.5 }}>
          {draftItems.map((item, index) => (
            <Box key={index} sx={{ display: 'flex', gap: 1 }}>
              <TextField
                select
                size="small"
                label="Repuesto"
                value={item.partId}
                onChange={(e) => updateItem(index, 'partId', e.target.value)}
                fullWidth
              >
                <MenuItem value="">— Selecciona —</MenuItem>
                {parts.map((p) => (
                  <MenuItem key={p.id} value={p.id}>
                    {p.name} {p.erpSku ? `· ${p.erpSku}` : ''} (disponible: {p.quantity})
                  </MenuItem>
                ))}
              </TextField>
              <TextField
                size="small"
                type="number"
                label="Cantidad"
                value={item.quantity}
                onChange={(e) => updateItem(index, 'quantity', e.target.value)}
                inputProps={{ min: 1 }}
                sx={{ width: 110 }}
              />
              <IconButton size="small" onClick={() => removeItemRow(index)} disabled={draftItems.length === 1}>
                <DeleteOutlineIcon fontSize="small" />
              </IconButton>
            </Box>
          ))}
          <Button size="small" startIcon={<AddIcon />} onClick={addItemRow} sx={{ alignSelf: 'flex-start' }}>
            Agregar repuesto
          </Button>
          <TextField label="Nota (opcional)" value={notes} onChange={(e) => setNotes(e.target.value)} multiline minRows={2} fullWidth />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5 }}>
          <Button onClick={() => setDialogOpen(false)} color="inherit">
            Cancelar
          </Button>
          <Button variant="contained" onClick={handleSubmit} disabled={submitting}>
            {submitting ? 'Enviando…' : 'Enviar solicitud'}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={rejectingId != null} onClose={() => setRejectingId(null)} maxWidth="xs" fullWidth>
        <DialogTitle>Rechazar solicitud</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            label="Motivo del rechazo"
            value={rejectionReason}
            onChange={(e) => setRejectionReason(e.target.value)}
            multiline
            minRows={2}
            fullWidth
            required
            sx={{ mt: 1 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRejectingId(null)} color="inherit">
            Cancelar
          </Button>
          <Button variant="contained" color="error" onClick={handleReject} disabled={!rejectionReason.trim()}>
            Rechazar solicitud
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
