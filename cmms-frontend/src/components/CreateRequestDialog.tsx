import { useEffect, useState, type FormEvent } from 'react';
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, TextField, MenuItem, Box, Alert } from '@mui/material';
import { requestsApi } from '../api/requests';
import { aiApi } from '../api/ai';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesomeRounded';
import { locationsApi } from '../api/locations';
import { assetsApi } from '../api/assets';
import { categoriesApi } from '../api/categories';
import type { AssetResponse, CategorySummary, LocationSummary, RequestItem, WorkOrderPriority } from '../types';
import { ApiRequestError } from '../api/client';
import ConfirmDialog from './ConfirmDialog';
import { PRIORITY_LABELS, PRIORITY_ORDER } from '../constants';

interface Props {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  editRequest?: RequestItem | null;
}

export default function CreateRequestDialog({ open, onClose, onSaved, editRequest }: Props) {
  const isEditMode = !!editRequest;

  const [locations, setLocations] = useState<LocationSummary[]>([]);
  const [assets, setAssets] = useState<AssetResponse[]>([]);
  const [categories, setCategories] = useState<CategorySummary[]>([]);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<WorkOrderPriority>('NONE');
  const [categoryId, setCategoryId] = useState('');
  const [assetId, setAssetId] = useState('');
  const [locationId, setLocationId] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [estimatedStartDate, setEstimatedStartDate] = useState('');
  const [contact, setContact] = useState('');

  const [error, setError] = useState<string | null>(null);
  const [dirty, setDirty] = useState(false);
  const [discardOpen, setDiscardOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [suggesting, setSuggesting] = useState(false);
  const [aiNote, setAiNote] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setDirty(false);
    locationsApi.list().then(setLocations).catch(() => setLocations([]));
    assetsApi.list({ size: 100 }).then((r) => setAssets(r.content)).catch(() => setAssets([]));
    categoriesApi.list('WORK_ORDER').then(setCategories).catch(() => setCategories([]));

    if (editRequest) {
      setTitle(editRequest.title);
      setDescription(editRequest.description ?? '');
      setPriority(editRequest.priority);
      setCategoryId(editRequest.categoryId ? String(editRequest.categoryId) : '');
      setAssetId(editRequest.assetId ? String(editRequest.assetId) : '');
      setLocationId(editRequest.locationId ? String(editRequest.locationId) : '');
      setDueDate(editRequest.dueDate ? editRequest.dueDate.slice(0, 16) : '');
      setEstimatedStartDate(editRequest.estimatedStartDate ? editRequest.estimatedStartDate.slice(0, 16) : '');
      setContact(editRequest.contact ?? '');
    } else {
      resetForm();
    }
  }, [open, editRequest]);

  function resetForm() {
    setTitle('');
    setDescription('');
    setPriority('NONE');
    setCategoryId('');
    setAssetId('');
    setLocationId('');
    setDueDate('');
    setContact('');
    setError(null);
  }

  async function handleSuggest() {
    if (!title.trim()) return;
    setSuggesting(true);
    setAiNote(null);
    try {
      const suggestion = await aiApi.suggestRequestClassification(title.trim(), description.trim() || undefined);
      if (suggestion.suggestedCategoryId) {
        setCategoryId(String(suggestion.suggestedCategoryId));
        setDirty(true);
      }
      if (suggestion.suggestedPriority) {
        setPriority(suggestion.suggestedPriority as WorkOrderPriority);
        setDirty(true);
      }
      setAiNote(suggestion.reasoning ?? 'Sugerencia aplicada.');
    } catch (err) {
      setAiNote(err instanceof ApiRequestError ? err.message : 'No se pudo obtener una sugerencia.');
    } finally {
      setSuggesting(false);
    }
  }

  function handleClose() {
    if (dirty) {
      setDiscardOpen(true);
      return;
    }
    onClose();
  }

  function handleDiscardConfirm() {
    setDiscardOpen(false);
    setDirty(false);
    onClose();
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    setSubmitting(true);
    setError(null);
    try {
      const payload = {
        title: title.trim(),
        description: description.trim() || undefined,
        priority,
        categoryId: categoryId ? Number(categoryId) : undefined,
        assetId: assetId ? Number(assetId) : undefined,
        locationId: locationId ? Number(locationId) : undefined,
        dueDate: dueDate ? new Date(dueDate).toISOString() : undefined,
        estimatedStartDate: estimatedStartDate ? new Date(estimatedStartDate).toISOString() : undefined,
        contact: contact || undefined,
      };
      if (isEditMode && editRequest) {
        await requestsApi.update(editRequest.id, payload);
      } else {
        await requestsApi.create(payload);
      }
      setDirty(false);
      onSaved();
      onClose();
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : `No se pudo ${isEditMode ? 'guardar' : 'crear'} la solicitud`);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <form onSubmit={handleSubmit}>
        <DialogTitle>{isEditMode ? 'Editar solicitud' : 'Nueva solicitud'}</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 2.5 }} onChange={() => setDirty(true)}>
          {error && <Alert severity="error">{error}</Alert>}

          <TextField label="Título" value={title} onChange={(e) => setTitle(e.target.value)} required fullWidth autoFocus />
          <TextField label="Descripción" value={description} onChange={(e) => setDescription(e.target.value)} multiline minRows={3} fullWidth />

          <Box>
            <Button
              type="button"
              size="small"
              startIcon={<AutoAwesomeIcon fontSize="small" />}
              onClick={handleSuggest}
              disabled={!title.trim() || suggesting}
            >
              {suggesting ? 'Pensando…' : 'Sugerir categoría y prioridad'}
            </Button>
            {aiNote && (
              <Alert severity="info" sx={{ mt: 1 }} onClose={() => setAiNote(null)}>
                {aiNote}
              </Alert>
            )}
          </Box>

          <Box sx={{ display: 'flex', gap: 2 }}>
            <TextField select label="Prioridad" value={priority} onChange={(e) => setPriority(e.target.value as WorkOrderPriority)} fullWidth>
              {PRIORITY_ORDER.map((p) => (
                <MenuItem key={p} value={p}>
                  {PRIORITY_LABELS[p]}
                </MenuItem>
              ))}
            </TextField>
            <TextField select label="Categoría" value={categoryId} onChange={(e) => setCategoryId(e.target.value)} fullWidth>
              <MenuItem value="">— Ninguna —</MenuItem>
              {categories.map((c) => (
                <MenuItem key={c.id} value={c.id}>
                  {c.name}
                </MenuItem>
              ))}
            </TextField>
          </Box>

          <Box sx={{ display: 'flex', gap: 2 }}>
            <TextField select label="Ubicación" value={locationId} onChange={(e) => setLocationId(e.target.value)} fullWidth>
              <MenuItem value="">— Ninguna —</MenuItem>
              {locations.map((l) => (
                <MenuItem key={l.id} value={l.id}>
                  {l.name}
                </MenuItem>
              ))}
            </TextField>
            <TextField select label="Activo" value={assetId} onChange={(e) => setAssetId(e.target.value)} fullWidth>
              <MenuItem value="">— Ninguno —</MenuItem>
              {assets.map((a) => (
                <MenuItem key={a.id} value={a.id}>
                  {a.name}
                </MenuItem>
              ))}
            </TextField>
          </Box>

          <TextField
            label="Fecha deseada"
            type="datetime-local"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
            InputLabelProps={{ shrink: true }}
            fullWidth
          />
          <TextField
            label="Fecha de inicio prevista"
            type="datetime-local"
            value={estimatedStartDate}
            onChange={(e) => setEstimatedStartDate(e.target.value)}
            InputLabelProps={{ shrink: true }}
            fullWidth
          />
          <TextField label="Contacto (opcional)" value={contact} onChange={(e) => setContact(e.target.value)} fullWidth />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5 }}>
          <Button onClick={handleClose} color="inherit">
            Cancelar
          </Button>
          <Button type="submit" variant="contained" disabled={submitting}>
            {submitting ? (isEditMode ? 'Guardando…' : 'Enviando…') : isEditMode ? 'Guardar cambios' : 'Enviar solicitud'}
          </Button>
        </DialogActions>
      </form>
      <ConfirmDialog
        open={discardOpen}
        onCancel={() => setDiscardOpen(false)}
        onConfirm={handleDiscardConfirm}
        confirmText="Descartar cambios"
        question="¿Descartar cambios no guardados? Si sales ahora, perderás los cambios no guardados"
      />
    </Dialog>
  );
}
