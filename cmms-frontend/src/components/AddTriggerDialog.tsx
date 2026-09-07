import { useEffect, useState, type FormEvent } from 'react';
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, TextField, MenuItem, Box, Typography, Alert, Divider } from '@mui/material';
import { assetsApi, type MeterTriggerPayload } from '../api/assets';
import { locationsApi } from '../api/locations';
import { categoriesApi } from '../api/categories';
import { teamsApi, type TeamMiniResponse } from '../api/teams';
import { usersApi, type UserMini } from '../api/users';
import type { AssetResponse, CategorySummary, LocationSummary, MeterEntry, MeterTriggerEntry, WorkOrderPriority } from '../types';
import { ApiRequestError } from '../api/client';
import ConfirmDialog from './ConfirmDialog';
import { PRIORITY_LABELS, PRIORITY_ORDER } from '../constants';

interface Props {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  meter: MeterEntry | null;
  editTrigger?: MeterTriggerEntry | null;
}

export default function AddTriggerDialog({ open, onClose, onSaved, meter, editTrigger }: Props) {
  const isEditMode = !!editTrigger;

  const [assets, setAssets] = useState<AssetResponse[]>([]);
  const [locations, setLocations] = useState<LocationSummary[]>([]);
  const [categories, setCategories] = useState<CategorySummary[]>([]);
  const [users, setUsers] = useState<UserMini[]>([]);
  const [teams, setTeams] = useState<TeamMiniResponse[]>([]);

  const [name, setName] = useState('');
  const [condition, setCondition] = useState<'LESS_THAN' | 'GREATER_THAN'>('LESS_THAN');
  const [value, setValue] = useState('');

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [locationId, setLocationId] = useState('');
  const [assetId, setAssetId] = useState('');
  const [priority, setPriority] = useState<WorkOrderPriority>('NONE');
  const [dueDate, setDueDate] = useState('');
  const [estimatedStartDate, setEstimatedStartDate] = useState('');
  const [estimatedDurationHours, setEstimatedDurationHours] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [primaryAssigneeId, setPrimaryAssigneeId] = useState('');
  const [teamId, setTeamId] = useState('');
  const [waitBeforeDays, setWaitBeforeDays] = useState('0');

  const [error, setError] = useState<string | null>(null);
  const [dirty, setDirty] = useState(false);
  const [discardOpen, setDiscardOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) return;
    setDirty(false);
    assetsApi.list({ size: 100 }).then((r) => setAssets(r.content)).catch(() => setAssets([]));
    locationsApi.list().then(setLocations).catch(() => setLocations([]));
    categoriesApi.list('WORK_ORDER').then(setCategories).catch(() => setCategories([]));
    usersApi.mini().then(setUsers).catch(() => setUsers([]));
    teamsApi.mini().then(setTeams).catch(() => setTeams([]));

    if (editTrigger) {
      setName(editTrigger.name);
      setCondition(editTrigger.condition);
      setValue(String(editTrigger.value));
      setTitle(editTrigger.workOrderTitle);
      setDescription(editTrigger.workOrderDescription ?? '');
      setLocationId(editTrigger.locationId ? String(editTrigger.locationId) : '');
      setAssetId(editTrigger.assetId ? String(editTrigger.assetId) : meter?.assetId ? String(meter.assetId) : '');
      setPriority(editTrigger.priority);
      setDueDate(editTrigger.dueDate ? editTrigger.dueDate.slice(0, 16) : '');
      setEstimatedStartDate(editTrigger.estimatedStartDate ? editTrigger.estimatedStartDate.slice(0, 16) : '');
      setEstimatedDurationHours(editTrigger.estimatedDurationMinutes ? String(editTrigger.estimatedDurationMinutes / 60) : '');
      setCategoryId(editTrigger.categoryId ? String(editTrigger.categoryId) : '');
      setPrimaryAssigneeId(editTrigger.primaryAssigneeId ? String(editTrigger.primaryAssigneeId) : '');
      setTeamId(editTrigger.teamId ? String(editTrigger.teamId) : '');
      setWaitBeforeDays(String(editTrigger.waitBeforeDays ?? 0));
    } else {
      setName('');
      setCondition('LESS_THAN');
      setValue('');
      setTitle('');
      setDescription('');
      setLocationId('');
      setAssetId(meter?.assetId ? String(meter.assetId) : '');
      setPriority('NONE');
      setDueDate('');
      setEstimatedStartDate('');
      setEstimatedDurationHours('');
      setCategoryId('');
      setPrimaryAssigneeId('');
      setTeamId('');
      setWaitBeforeDays('0');
    }
    setError(null);
  }, [open, editTrigger, meter]);

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
    if (!meter || !name.trim() || !value || !title.trim()) return;
    setSubmitting(true);
    setError(null);
    try {
      const payload: MeterTriggerPayload = {
        name: name.trim(),
        condition,
        value: Number(value),
        workOrderTitle: title.trim(),
        workOrderDescription: description.trim() || undefined,
        priority,
        primaryAssigneeId: primaryAssigneeId ? Number(primaryAssigneeId) : undefined,
        waitBeforeDays: waitBeforeDays ? Number(waitBeforeDays) : 0,
        categoryId: categoryId ? Number(categoryId) : undefined,
        locationId: locationId ? Number(locationId) : undefined,
        assetId: assetId ? Number(assetId) : undefined,
        teamId: teamId ? Number(teamId) : undefined,
        dueDate: dueDate ? new Date(dueDate).toISOString() : undefined,
        estimatedStartDate: estimatedStartDate ? new Date(estimatedStartDate).toISOString() : undefined,
        estimatedDurationMinutes: estimatedDurationHours ? Number(estimatedDurationHours) * 60 : undefined,
      };
      if (isEditMode && editTrigger) {
        await assetsApi.updateMeterTrigger(editTrigger.id, payload);
      } else {
        await assetsApi.createMeterTrigger(meter.id, payload);
      }
      setDirty(false);
      onSaved();
      onClose();
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : `No se pudo ${isEditMode ? 'guardar' : 'crear'} el disparador`);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <form onSubmit={handleSubmit}>
        <DialogTitle sx={{ pb: 0.5 }}>
          {isEditMode ? 'Editar disparador' : 'Agregar disparador a la orden de trabajo'}
          <Typography variant="body2" sx={{ color: 'text.secondary', fontWeight: 400, mt: 0.5 }}>
            Completa los campos para {isEditMode ? 'actualizar el' : 'crear y agregar un'} disparador a la Orden de Trabajo
          </Typography>
        </DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 2.5 }} onChange={() => setDirty(true)}>
          {error && <Alert severity="error">{error}</Alert>}

          <TextField label="Nombre del disparador" value={name} onChange={(e) => setName(e.target.value)} required fullWidth autoFocus />
          <Box sx={{ display: 'flex', gap: 2 }}>
            <TextField
              select
              label="Cuando la lectura del medidor sea"
              value={condition}
              onChange={(e) => setCondition(e.target.value as 'LESS_THAN' | 'GREATER_THAN')}
              fullWidth
            >
              <MenuItem value="LESS_THAN">Menor a</MenuItem>
              <MenuItem value="GREATER_THAN">Mayor a</MenuItem>
            </TextField>
            <TextField
              label={`Valor${meter?.unit ? ` (${meter.unit})` : ''}`}
              type="number"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              required
              fullWidth
            />
          </Box>
          <TextField
            label="Días de espera antes de repetirse"
            type="number"
            value={waitBeforeDays}
            onChange={(e) => setWaitBeforeDays(e.target.value)}
            inputProps={{ min: 0 }}
            helperText="0 = puede volver a dispararse en cualquier lectura siguiente"
            sx={{ width: 280 }}
          />

          <Divider textAlign="left">
            <Typography variant="caption" sx={{ color: 'text.secondary' }}>
              Configuración de la orden de trabajo
            </Typography>
          </Divider>

          <TextField label="Título" value={title} onChange={(e) => setTitle(e.target.value)} required fullWidth />
          <TextField label="Descripción" value={description} onChange={(e) => setDescription(e.target.value)} multiline minRows={2} fullWidth />

          <Box sx={{ display: 'flex', gap: 2 }}>
            <TextField select label="Ubicación" value={locationId} onChange={(e) => setLocationId(e.target.value)} fullWidth>
              <MenuItem value="">— Ninguna —</MenuItem>
              {locations.map((l) => (
                <MenuItem key={l.id} value={l.id}>
                  {l.name}
                </MenuItem>
              ))}
            </TextField>
            <TextField select label="Activo" value={assetId} onChange={(e) => setAssetId(e.target.value)} required fullWidth>
              <MenuItem value="">— Selecciona un activo —</MenuItem>
              {assets.map((a) => (
                <MenuItem key={a.id} value={a.id}>
                  {a.name}
                </MenuItem>
              ))}
            </TextField>
          </Box>

          <TextField select label="Prioridad" value={priority} onChange={(e) => setPriority(e.target.value as WorkOrderPriority)} fullWidth>
            {PRIORITY_ORDER.map((p) => (
              <MenuItem key={p} value={p}>
                {PRIORITY_LABELS[p]}
              </MenuItem>
            ))}
          </TextField>

          <Box sx={{ display: 'flex', gap: 2 }}>
            <TextField
              label="Fecha de vencimiento"
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
          </Box>

          <TextField
            label="Duración estimada (horas)"
            type="number"
            value={estimatedDurationHours}
            onChange={(e) => setEstimatedDurationHours(e.target.value)}
            inputProps={{ min: 0, step: 0.5 }}
            sx={{ width: 220 }}
          />

          <Box sx={{ display: 'flex', gap: 2 }}>
            <TextField select label="Categoría" value={categoryId} onChange={(e) => setCategoryId(e.target.value)} fullWidth>
              <MenuItem value="">— Ninguna —</MenuItem>
              {categories.map((c) => (
                <MenuItem key={c.id} value={c.id}>
                  {c.name}
                </MenuItem>
              ))}
            </TextField>
            <TextField select label="Trabajador principal" value={primaryAssigneeId} onChange={(e) => setPrimaryAssigneeId(e.target.value)} fullWidth>
              <MenuItem value="">— Ninguno —</MenuItem>
              {users.map((u) => (
                <MenuItem key={u.id} value={u.id}>
                  {u.fullName || u.email}
                </MenuItem>
              ))}
            </TextField>
          </Box>

          <TextField select label="Equipo" value={teamId} onChange={(e) => setTeamId(e.target.value)} fullWidth>
            <MenuItem value="">— Ninguno —</MenuItem>
            {teams.map((t) => (
              <MenuItem key={t.id} value={t.id}>
                {t.name}
              </MenuItem>
            ))}
          </TextField>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5 }}>
          <Button onClick={handleClose} color="inherit">
            Cancelar
          </Button>
          <Button type="submit" variant="contained" disabled={submitting}>
            {submitting ? (isEditMode ? 'Guardando…' : 'Creando…') : isEditMode ? 'Guardar cambios' : 'Agregar'}
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
