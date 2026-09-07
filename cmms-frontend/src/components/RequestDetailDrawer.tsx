import { useState } from 'react';
import {
  Drawer,
  Box,
  Typography,
  IconButton,
  Chip,
  Divider,
  Grid,
  Button,
  TextField,
  Alert,
  Stack,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBackRounded';
import CheckCircleIcon from '@mui/icons-material/CheckCircleRounded';
import CancelIcon from '@mui/icons-material/CancelRounded';
import EditTwoToneIcon from '@mui/icons-material/EditTwoTone';
import { requestsApi } from '../api/requests';
import type { RequestItem } from '../types';
import { ApiRequestError } from '../api/client';
import { PRIORITY_COLORS, PRIORITY_LABELS, REQUEST_STATUS_LABELS, REQUEST_STATUS_COLORS } from '../constants';
import { useAuth } from '../context/AuthContext';

interface Props {
  request: RequestItem | null;
  onClose: () => void;
  onChanged: () => void;
  onEdit: (r: RequestItem) => void;
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

export default function RequestDetailDrawer({ request, onClose, onChanged, onEdit, onSelectWorkOrder }: Props) {
  const { role } = useAuth();
  const canModerate = role === 'ADMIN' || role === 'LIMITED_ADMIN';

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState('');

  async function handleApprove() {
    if (!request) return;
    setBusy(true);
    setError(null);
    try {
      await requestsApi.approve(request.id);
      onChanged();
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : 'No se pudo aprobar la solicitud');
    } finally {
      setBusy(false);
    }
  }

  async function handleCancel() {
    if (!request || !cancelReason.trim()) return;
    setBusy(true);
    setError(null);
    try {
      await requestsApi.cancel(request.id, cancelReason.trim());
      setCancelOpen(false);
      setCancelReason('');
      onChanged();
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : 'No se pudo rechazar la solicitud');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Drawer anchor="right" open={!!request} onClose={onClose} PaperProps={{ sx: { width: { xs: '90%', sm: '70%', md: '50%' } } }}>
      {request && (
        <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', p: 2, borderBottom: '1px solid', borderColor: 'divider' }}>
            <IconButton size="small" onClick={onClose} sx={{ ml: -1 }}>
              <ArrowBackIcon fontSize="small" />
            </IconButton>
            {request.status === 'PENDING' && (
              <IconButton size="small" onClick={() => onEdit(request)} sx={{ color: 'primary.main' }}>
                <EditTwoToneIcon fontSize="small" />
              </IconButton>
            )}
          </Box>

          <Box sx={{ p: 3, flex: 1, overflowY: 'auto' }}>
            <Stack direction="row" spacing={1} sx={{ mb: 1 }}>
              <Chip label={REQUEST_STATUS_LABELS[request.status]} size="small" color={REQUEST_STATUS_COLORS[request.status]} />
              {request.priority !== 'NONE' && (
                <Chip
                  label={PRIORITY_LABELS[request.priority]}
                  size="small"
                  sx={{ bgcolor: PRIORITY_COLORS[request.priority].bg, color: PRIORITY_COLORS[request.priority].text }}
                />
              )}
            </Stack>

            <Typography variant="h5" sx={{ fontWeight: 700 }}>
              {request.title}
            </Typography>
            {request.description && (
              <Typography variant="body2" sx={{ color: 'text.secondary', mt: 0.5 }}>
                {request.description}
              </Typography>
            )}

            {error && (
              <Alert severity="error" sx={{ mt: 2 }} onClose={() => setError(null)}>
                {error}
              </Alert>
            )}

            {request.status === 'PENDING' && canModerate && (
              <Box sx={{ display: 'flex', gap: 1.5, mt: 2.5, mb: 1 }}>
                <Button variant="contained" color="success" startIcon={<CheckCircleIcon />} onClick={handleApprove} disabled={busy}>
                  Aprobar
                </Button>
                <Button variant="outlined" color="error" startIcon={<CancelIcon />} onClick={() => setCancelOpen(true)} disabled={busy}>
                  Rechazar
                </Button>
              </Box>
            )}

            {request.status === 'APPROVED' && request.workOrderId && (
              <Alert severity="success" sx={{ mt: 2, cursor: 'pointer' }} onClick={() => onSelectWorkOrder(request.workOrderId!)}>
                Aprobada — ver la orden de trabajo generada →
              </Alert>
            )}

            {request.status === 'CANCELLED' && request.cancellationReason && (
              <Alert severity="error" sx={{ mt: 2 }}>
                Rechazada. Motivo: {request.cancellationReason}
              </Alert>
            )}

            <Divider sx={{ my: 2 }} />

            <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1.5 }}>
              Detalles
            </Typography>
            <Grid container spacing={2}>
              <Field label="ID" value={request.customId} />
              <Field label="Categoría" value={request.categoryName} />
              <Field label="Ubicación" value={request.locationName} />
              <Field label="Activo" value={request.assetName} />
              <Field label="Fecha deseada" value={request.dueDate ? new Date(request.dueDate).toLocaleString() : '—'} />
              <Field
                label="Fecha de inicio prevista"
                value={request.estimatedStartDate ? new Date(request.estimatedStartDate).toLocaleString() : '—'}
              />
              <Field label="Solicitado por" value={request.createdByName} />
              <Field label="Contacto" value={request.contact} />
              <Field label="Creada el" value={new Date(request.createdAt).toLocaleString()} />
            </Grid>
          </Box>
        </Box>
      )}

      <Dialog open={cancelOpen} onClose={() => setCancelOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Rechazar solicitud</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            label="Motivo del rechazo"
            value={cancelReason}
            onChange={(e) => setCancelReason(e.target.value)}
            multiline
            minRows={2}
            fullWidth
            required
            sx={{ mt: 1 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCancelOpen(false)} color="inherit">
            Cancelar
          </Button>
          <Button variant="contained" color="error" onClick={handleCancel} disabled={busy || !cancelReason.trim()}>
            Rechazar solicitud
          </Button>
        </DialogActions>
      </Dialog>
    </Drawer>
  );
}
