import { useEffect, useState, type FormEvent } from 'react';
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, TextField, MenuItem, Alert, Typography } from '@mui/material';
import { locationsApi } from '../api/locations';
import { assetsApi } from '../api/assets';
import { usersApi, type UserMini } from '../api/users';
import { teamsApi } from '../api/teams';
import { categoriesApi } from '../api/categories';
import type { AssetResponse, CategorySummary, LocationSummary, MeterEntry } from '../types';
import { ApiRequestError } from '../api/client';
import ConfirmDialog from './ConfirmDialog';

interface Props {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  editMeter?: MeterEntry | null;
}

export default function CreateMeterDialog({ open, onClose, onSaved, editMeter }: Props) {
  const isEditMode = !!editMeter;
  const [assets, setAssets] = useState<AssetResponse[]>([]);
  const [users, setUsers] = useState<UserMini[]>([]);
  const [categories, setCategories] = useState<CategorySummary[]>([]);

  const [name, setName] = useState('');
  const [unit, setUnit] = useState('');
  const [updateFrequencyDays, setUpdateFrequencyDays] = useState('30');
  const [assetId, setAssetId] = useState('');
  // Igual que el real: el medidor puede tener su PROPIA ubicacion, distinta
  // a la del activo. Es opcional (solo el activo es obligatorio), pero sin
  // ella la columna "Ubicacion" del listado sale vacia y el filtro no sirve.
  const [locationId, setLocationId] = useState('');
  const [locations, setLocations] = useState<LocationSummary[]>([]);
  const [teamId, setTeamId] = useState<number | ''>('');
  const [teams, setTeams] = useState<{ id: number; name: string }[]>([]);
  const [categoryId, setCategoryId] = useState('');
  const [assignedUserIds, setAssignedUserIds] = useState<string[]>([]);

  const [error, setError] = useState<string | null>(null);
  const [dirty, setDirty] = useState(false);
  const [discardOpen, setDiscardOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) return;
    setDirty(false);
    assetsApi.list({ size: 100 }).then((r) => setAssets(r.content)).catch(() => setAssets([]));
    locationsApi.list().then(setLocations).catch(() => setLocations([]));
    usersApi.mini().then(setUsers).catch(() => setUsers([]));
    teamsApi.mini().then(setTeams).catch(() => setTeams([]));
    categoriesApi.list('METER').then(setCategories).catch(() => setCategories([]));
    if (editMeter) {
      setName(editMeter.name);
      setUnit(editMeter.unit ?? '');
      setUpdateFrequencyDays(String(editMeter.updateFrequencyDays));
      setAssetId(editMeter.assetId ? String(editMeter.assetId) : '');
      setLocationId(editMeter.locationId ? String(editMeter.locationId) : '');
      setCategoryId(editMeter.categoryId ? String(editMeter.categoryId) : '');
      setAssignedUserIds(editMeter.assignedUserIds.map(String));
      setTeamId(editMeter.teamId ?? '');
    } else {
      setName('');
      setUnit('');
      setUpdateFrequencyDays('30');
      setAssetId('');
      setLocationId('');
      setCategoryId('');
      setAssignedUserIds([]);
    }
    setError(null);
  }, [open, editMeter]);

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
    if (!name.trim() || !assetId) return;
    setSubmitting(true);
    setError(null);
    try {
      if (isEditMode && editMeter) {
        await assetsApi.updateMeter(
          editMeter.id,
          name.trim(),
          unit || undefined,
          updateFrequencyDays ? Number(updateFrequencyDays) : undefined,
          assignedUserIds.length > 0 ? assignedUserIds.map(Number) : undefined,
          categoryId ? Number(categoryId) : undefined,
          locationId ? Number(locationId) : undefined,
          teamId || undefined,
        );
      } else {
        await assetsApi.createMeterStandalone(
          Number(assetId),
          name.trim(),
          unit || undefined,
          updateFrequencyDays ? Number(updateFrequencyDays) : undefined,
          assignedUserIds.length > 0 ? assignedUserIds.map(Number) : undefined,
          categoryId ? Number(categoryId) : undefined,
          locationId ? Number(locationId) : undefined,
          teamId || undefined,
        );
      }
      setDirty(false);
      onSaved();
      onClose();
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : `No se pudo ${isEditMode ? 'guardar' : 'crear'} el medidor`);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <form onSubmit={handleSubmit}>
        <DialogTitle sx={{ pb: 0.5 }}>
          {isEditMode ? 'Editar medidor' : 'Agregar medidor'}
          <Typography variant="body2" sx={{ color: 'text.secondary', fontWeight: 400, mt: 0.5 }}>
            {isEditMode ? 'Actualiza los datos del medidor' : 'Completa los campos para crear un nuevo medidor'}
          </Typography>
        </DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 2.5 }} onChange={() => setDirty(true)}>
          {error && <Alert severity="error">{error}</Alert>}

          <TextField label="Nombre" value={name} onChange={(e) => setName(e.target.value)} required fullWidth autoFocus />
          <TextField label="Unidad" value={unit} onChange={(e) => setUnit(e.target.value)} placeholder="ej. horas, km" fullWidth />
          <TextField
            label="Frecuencia de actualización (días)"
            type="number"
            value={updateFrequencyDays}
            onChange={(e) => setUpdateFrequencyDays(e.target.value)}
            inputProps={{ min: 1 }}
            fullWidth
          />
          <TextField select label="Activo" value={assetId} onChange={(e) => setAssetId(e.target.value)} required fullWidth disabled={isEditMode}>
            <MenuItem value="">— Selecciona un activo —</MenuItem>
            {assets.map((a) => (
              <MenuItem key={a.id} value={a.id}>
                {a.name}
              </MenuItem>
            ))}
          </TextField>
          <TextField select label="Ubicación" value={locationId} onChange={(e) => setLocationId(e.target.value)} fullWidth>
            <MenuItem value="">— Ninguna —</MenuItem>
            {locations.map((l) => (
              <MenuItem key={l.id} value={l.id}>
                {l.name}
              </MenuItem>
            ))}
          </TextField>
          {/* Equipo responsable: determina quien VE el medidor en el
              listado. Sin equipo, lo ve todo el mundo. */}
          <TextField
            select
            label="Equipo responsable"
            value={teamId}
            onChange={(e) => setTeamId(e.target.value === '' ? '' : Number(e.target.value))}
            fullWidth
            helperText="Solo los integrantes de este equipo verán el medidor. Sin equipo, lo ve todo el mundo."
          >
            <MenuItem value="">Sin equipo</MenuItem>
            {teams.map((t) => (
              <MenuItem key={t.id} value={t.id}>
                {t.name}
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
          <TextField
            select
            label="Trabajadores a avisar"
            value={assignedUserIds}
            onChange={(e) => {
              const value = e.target.value;
              setAssignedUserIds(typeof value === 'string' ? value.split(',') : (value as unknown as string[]));
            }}
            SelectProps={{ multiple: true }}
            fullWidth
          >
            {users.map((u) => (
              <MenuItem key={u.id} value={String(u.id)}>
                {u.fullName || u.email}
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
