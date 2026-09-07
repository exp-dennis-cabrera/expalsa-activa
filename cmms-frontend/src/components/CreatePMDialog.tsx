import { useEffect, useState, type FormEvent } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  MenuItem,
  Box,
  Typography,
  Chip,
  Alert,
} from '@mui/material';
import { preventiveMaintenanceApi } from '../api/preventiveMaintenance';
import { locationsApi } from '../api/locations';
import { assetsApi } from '../api/assets';
import { usersApi, type UserMini } from '../api/users';
import { categoriesApi } from '../api/categories';
import { teamsApi, type TeamMiniResponse } from '../api/teams';
import type {
  AssetResponse,
  CategorySummary,
  LocationSummary,
  PreventiveMaintenance,
  RecurrenceType,
  RecurrenceBasedOn,
} from '../types';
import { ApiRequestError } from '../api/client';
import ConfirmDialog from './ConfirmDialog';
import { PRIORITY_LABELS, PRIORITY_ORDER, RECURRENCE_TYPE_LABELS, RECURRENCE_BASED_ON_LABELS, WEEKDAY_LABELS_SHORT } from '../constants';

interface Props {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  editPM?: PreventiveMaintenance | null;
}

const RECURRENCE_TYPES: RecurrenceType[] = ['DAILY', 'WEEKLY', 'MONTHLY', 'YEARLY'];
const RECURRENCE_BASED_ON: RecurrenceBasedOn[] = ['SCHEDULED_DATE', 'COMPLETED_DATE'];

function toLocalInput(iso: string | null) {
  if (!iso) return '';
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function CreatePMDialog({ open, onClose, onSaved, editPM }: Props) {
  const isEditMode = !!editPM;

  const [locations, setLocations] = useState<LocationSummary[]>([]);
  const [assets, setAssets] = useState<AssetResponse[]>([]);
  const [users, setUsers] = useState<UserMini[]>([]);
  const [categories, setCategories] = useState<CategorySummary[]>([]);
  const [teams, setTeams] = useState<TeamMiniResponse[]>([]);

  const [name, setName] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<(typeof PRIORITY_ORDER)[number]>('NONE');
  const [categoryId, setCategoryId] = useState('');
  const [assetId, setAssetId] = useState('');
  const [locationId, setLocationId] = useState('');
  const [teamId, setTeamId] = useState('');
  const [primaryAssigneeId, setPrimaryAssigneeId] = useState('');
  const [estimatedDurationHours, setEstimatedDurationHours] = useState('');

  const [startsOn, setStartsOn] = useState('');
  const [frequency, setFrequency] = useState('1');
  const [recurrenceType, setRecurrenceType] = useState<RecurrenceType>('MONTHLY');
  const [recurrenceBasedOn, setRecurrenceBasedOn] = useState<RecurrenceBasedOn>('SCHEDULED_DATE');
  const [daysOfWeek, setDaysOfWeek] = useState<number[]>([]);
  const [endsOn, setEndsOn] = useState('');
  const [dueDateDelay, setDueDateDelay] = useState('');
  const [daysBeforeNotification, setDaysBeforeNotification] = useState('3');

  const [error, setError] = useState<string | null>(null);
  const [dirty, setDirty] = useState(false);
  const [discardOpen, setDiscardOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) return;
    setDirty(false);
    locationsApi.list().then(setLocations).catch(() => setLocations([]));
    assetsApi.list({ size: 100 }).then((r) => setAssets(r.content)).catch(() => setAssets([]));
    usersApi.mini().then(setUsers).catch(() => setUsers([]));
    categoriesApi.list('WORK_ORDER').then(setCategories).catch(() => setCategories([]));
    teamsApi.mini().then(setTeams).catch(() => setTeams([]));

    if (editPM) {
      setName(editPM.name);
      setTitle(editPM.title);
      setDescription(editPM.description ?? '');
      setPriority(editPM.priority);
      setCategoryId(editPM.categoryId ? String(editPM.categoryId) : '');
      setAssetId(editPM.assetId ? String(editPM.assetId) : '');
      setLocationId(editPM.locationId ? String(editPM.locationId) : '');
      setTeamId(editPM.teamId ? String(editPM.teamId) : '');
      setPrimaryAssigneeId(editPM.primaryAssigneeId ? String(editPM.primaryAssigneeId) : '');
      setEstimatedDurationHours(
        editPM.estimatedDurationMinutes ? String(editPM.estimatedDurationMinutes / 60) : '',
      );
      setStartsOn(toLocalInput(editPM.schedule.startsOn));
      setFrequency(String(editPM.schedule.frequency));
      setRecurrenceType(editPM.schedule.recurrenceType);
      setRecurrenceBasedOn(editPM.schedule.recurrenceBasedOn);
      setDaysOfWeek(editPM.schedule.daysOfWeek ?? []);
      setEndsOn(toLocalInput(editPM.schedule.endsOn));
      setDueDateDelay(editPM.schedule.dueDateDelay ? String(editPM.schedule.dueDateDelay) : '');
      setDaysBeforeNotification(editPM.daysBeforeNotification != null ? String(editPM.daysBeforeNotification) : '3');
    } else {
      resetForm();
    }
  }, [open, editPM]);

  function resetForm() {
    setName('');
    setTitle('');
    setDescription('');
    setPriority('NONE');
    setCategoryId('');
    setAssetId('');
    setLocationId('');
    setTeamId('');
    setPrimaryAssigneeId('');
    setEstimatedDurationHours('');
    setStartsOn(toLocalInput(new Date().toISOString()));
    setFrequency('1');
    setRecurrenceType('MONTHLY');
    setRecurrenceBasedOn('SCHEDULED_DATE');
    setDaysOfWeek([]);
    setEndsOn('');
    setDueDateDelay('');
    setDaysBeforeNotification('3');
    setError(null);
  }

  function toggleDayOfWeek(day: number) {
    setDaysOfWeek((prev) => (prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day].sort()));
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
    if (!name.trim() || !title.trim() || !startsOn) return;
    if (recurrenceType === 'WEEKLY' && daysOfWeek.length === 0) {
      setError('Selecciona al menos un día de la semana para la recurrencia semanal.');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const payload = {
        name: name.trim(),
        title: title.trim(),
        description: description.trim() || undefined,
        priority,
        categoryId: categoryId ? Number(categoryId) : undefined,
        assetId: assetId ? Number(assetId) : undefined,
        locationId: locationId ? Number(locationId) : undefined,
        teamId: teamId ? Number(teamId) : undefined,
        primaryAssigneeId: primaryAssigneeId ? Number(primaryAssigneeId) : undefined,
        estimatedDurationMinutes: estimatedDurationHours ? Number(estimatedDurationHours) * 60 : undefined,
        daysBeforeNotification: daysBeforeNotification ? Number(daysBeforeNotification) : undefined,
        schedule: {
          startsOn: new Date(startsOn).toISOString(),
          frequency: Number(frequency),
          endsOn: endsOn ? new Date(endsOn).toISOString() : undefined,
          dueDateDelay: dueDateDelay ? Number(dueDateDelay) : undefined,
          recurrenceType,
          recurrenceBasedOn,
          daysOfWeek: recurrenceType === 'WEEKLY' ? daysOfWeek : [],
        },
      };
      if (isEditMode && editPM) {
        await preventiveMaintenanceApi.update(editPM.id, payload);
      } else {
        await preventiveMaintenanceApi.create(payload);
      }
      setDirty(false);
      onSaved();
      onClose();
    } catch (err) {
      const message = err instanceof ApiRequestError ? err.message : `No se pudo ${isEditMode ? 'guardar' : 'crear'} el mantenimiento preventivo`;
      setError(message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <form onSubmit={handleSubmit}>
        <DialogTitle sx={{ pb: 0.5 }}>
          {isEditMode ? 'Editar Mantenimiento Preventivo' : 'Agregar Mantenimiento Preventivo'}
          <Typography variant="body2" sx={{ color: 'text.secondary', fontWeight: 400, mt: 0.5 }}>
            Genera órdenes de trabajo automáticamente según la recurrencia que definas
          </Typography>
        </DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2.2, pt: 2.5 }} onChange={() => setDirty(true)}>
          {error && <Alert severity="error">{error}</Alert>}

          <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
            Configuración del disparador
          </Typography>

          <TextField
            label="Nombre del disparador"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            fullWidth
            autoFocus
            helperText="Identifica este mantenimiento preventivo -- no es el titulo de las ordenes que genera"
          />

          <Box sx={{ display: 'flex', gap: 2 }}>
            <TextField
              label="Empieza el"
              type="datetime-local"
              value={startsOn}
              onChange={(e) => setStartsOn(e.target.value)}
              required
              fullWidth
              InputLabelProps={{ shrink: true }}
            />
            <TextField
              label="Termina el (opcional)"
              type="datetime-local"
              value={endsOn}
              onChange={(e) => setEndsOn(e.target.value)}
              fullWidth
              InputLabelProps={{ shrink: true }}
            />
          </Box>

          <Box sx={{ display: 'flex', gap: 2 }}>
            <TextField
              label="Frecuencia"
              type="number"
              value={frequency}
              onChange={(e) => setFrequency(e.target.value)}
              inputProps={{ min: 1 }}
              required
              sx={{ width: 140 }}
            />
            <TextField select label="Tipo de recurrencia" value={recurrenceType} onChange={(e) => setRecurrenceType(e.target.value as RecurrenceType)} fullWidth>
              {RECURRENCE_TYPES.map((t) => (
                <MenuItem key={t} value={t}>
                  {RECURRENCE_TYPE_LABELS[t]}
                </MenuItem>
              ))}
            </TextField>
          </Box>

          {recurrenceType === 'WEEKLY' && (
            <Box>
              <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mb: 0.5 }}>
                Días de la semana
              </Typography>
              <Box sx={{ display: 'flex', gap: 0.75, flexWrap: 'wrap' }}>
                {WEEKDAY_LABELS_SHORT.map((label, index) => (
                  <Chip
                    key={label}
                    label={label}
                    onClick={() => toggleDayOfWeek(index)}
                    color={daysOfWeek.includes(index) ? 'primary' : 'default'}
                    variant={daysOfWeek.includes(index) ? 'filled' : 'outlined'}
                  />
                ))}
              </Box>
            </Box>
          )}

          <TextField select label="Basado en" value={recurrenceBasedOn} onChange={(e) => setRecurrenceBasedOn(e.target.value as RecurrenceBasedOn)} fullWidth>
            {RECURRENCE_BASED_ON.map((b) => (
              <MenuItem key={b} value={b}>
                {RECURRENCE_BASED_ON_LABELS[b]}
              </MenuItem>
            ))}
          </TextField>

          <TextField
            label="Avisar por correo X días antes"
            type="number"
            value={daysBeforeNotification}
            onChange={(e) => setDaysBeforeNotification(e.target.value)}
            inputProps={{ min: 0 }}
            helperText="0 desactiva el aviso previo. Se manda a los administradores y al trabajador principal."
            sx={{ width: 280 }}
          />

          <Typography variant="subtitle2" sx={{ fontWeight: 700, mt: 1 }}>
            Configuración de la orden de trabajo
          </Typography>
          <Typography variant="caption" sx={{ color: 'text.secondary', mt: -1.5 }}>
            Estos campos se copian a cada orden de trabajo que este mantenimiento genera
          </Typography>

          <TextField
            label="Título de la orden de trabajo"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            fullWidth
          />
          <TextField
            label="Descripción"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            multiline
            minRows={2}
            fullWidth
          />

          <Box sx={{ display: 'flex', gap: 2 }}>
            <TextField select label="Prioridad" value={priority} onChange={(e) => setPriority(e.target.value as typeof priority)} fullWidth>
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

          <Box sx={{ display: 'flex', gap: 2 }}>
            <TextField select label="Trabajador principal" value={primaryAssigneeId} onChange={(e) => setPrimaryAssigneeId(e.target.value)} fullWidth>
              <MenuItem value="">— Ninguno —</MenuItem>
              {users.map((u) => (
                <MenuItem key={u.id} value={u.id}>
                  {u.fullName || u.email}
                </MenuItem>
              ))}
            </TextField>
            <TextField select label="Equipo" value={teamId} onChange={(e) => setTeamId(e.target.value)} fullWidth>
              <MenuItem value="">— Ninguno —</MenuItem>
              {teams.map((t) => (
                <MenuItem key={t.id} value={t.id}>
                  {t.name}
                </MenuItem>
              ))}
            </TextField>
          </Box>

          <TextField
            label="Duración estimada (horas)"
            type="number"
            value={estimatedDurationHours}
            onChange={(e) => setEstimatedDurationHours(e.target.value)}
            inputProps={{ min: 0, step: 0.5 }}
            sx={{ width: 220 }}
          />

          <TextField
            label="Días de plazo para la fecha de vencimiento (opcional)"
            type="number"
            value={dueDateDelay}
            onChange={(e) => setDueDateDelay(e.target.value)}
            inputProps={{ min: 1 }}
            helperText="Cada orden generada vencerá X días después de crearse"
            fullWidth
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5 }}>
          <Button onClick={handleClose} color="inherit">
            Cancelar
          </Button>
          <Button type="submit" variant="contained" disabled={submitting}>
            {submitting ? (isEditMode ? 'Guardando…' : 'Creando…') : isEditMode ? 'Guardar cambios' : 'Crear'}
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
