import { useEffect, useState, type FormEvent } from 'react';
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, TextField, MenuItem, Box, Alert } from '@mui/material';
import { locationsApi } from '../api/locations';
import { usersApi, type UserMini } from '../api/users';
import { vendorsApi } from '../api/vendors';
import { teamsApi, type TeamMiniResponse } from '../api/teams';
import type { LocationResponse, VendorSummary } from '../types';
import { ApiRequestError, uploadFile } from '../api/client';
import ConfirmDialog from './ConfirmDialog';

interface Props {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  editLocation?: LocationResponse | null;
  allLocations: LocationResponse[];
}

export default function CreateLocationDialog({ open, onClose, onSaved, editLocation, allLocations }: Props) {
  const isEditMode = !!editLocation;

  const [users, setUsers] = useState<UserMini[]>([]);
  const [vendors, setVendors] = useState<VendorSummary[]>([]);
  const [teams, setTeams] = useState<TeamMiniResponse[]>([]);

  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [latitude, setLatitude] = useState('');
  const [longitude, setLongitude] = useState('');
  const [parentLocationId, setParentLocationId] = useState('');
  const [assignedUserIds, setAssignedUserIds] = useState<string[]>([]);
  const [vendorIds, setVendorIds] = useState<string[]>([]);
  const [teamIds, setTeamIds] = useState<string[]>([]);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [existingImageUrl, setExistingImageUrl] = useState<string | null>(null);

  const [error, setError] = useState<string | null>(null);
  const [dirty, setDirty] = useState(false);
  const [discardOpen, setDiscardOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) return;
    setDirty(false);
    usersApi.mini().then(setUsers).catch(() => setUsers([]));
    vendorsApi.list().then(setVendors).catch(() => setVendors([]));
    teamsApi.mini().then(setTeams).catch(() => setTeams([]));

    if (editLocation) {
      setName(editLocation.name);
      setAddress(editLocation.address ?? '');
      setLatitude(editLocation.latitude != null ? String(editLocation.latitude) : '');
      setLongitude(editLocation.longitude != null ? String(editLocation.longitude) : '');
      setParentLocationId(editLocation.parentLocationId ? String(editLocation.parentLocationId) : '');
      setAssignedUserIds(editLocation.assignedUsers.map((u) => String(u.id)));
      setVendorIds(editLocation.vendors.map((v) => String(v.id)));
      setTeamIds(editLocation.teams.map((t) => String(t.id)));
      setExistingImageUrl(editLocation.imageUrl);
      setImageFile(null);
    } else {
      setName('');
      setAddress('');
      setLatitude('');
      setLongitude('');
      setParentLocationId('');
      setAssignedUserIds([]);
      setVendorIds([]);
      setTeamIds([]);
      setExistingImageUrl(null);
      setImageFile(null);
    }
    setError(null);
  }, [open, editLocation]);

  function multiSelectChange(setter: (v: string[]) => void) {
    return (e: { target: { value: unknown } }) => {
      const value = e.target.value;
      setter(typeof value === 'string' ? value.split(',') : (value as string[]));
    };
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
    if (!name.trim()) return;
    setSubmitting(true);
    setError(null);
    try {
      const payload = {
        name: name.trim(),
        address: address.trim() || undefined,
        latitude: latitude ? Number(latitude) : undefined,
        longitude: longitude ? Number(longitude) : undefined,
        parentLocationId: parentLocationId ? Number(parentLocationId) : undefined,
        assignedUserIds: assignedUserIds.length > 0 ? assignedUserIds.map(Number) : undefined,
        vendorIds: vendorIds.length > 0 ? vendorIds.map(Number) : undefined,
        teamIds: teamIds.length > 0 ? teamIds.map(Number) : undefined,
      };
      let locationId: number;
      if (isEditMode && editLocation) {
        let imageUrl = existingImageUrl ?? undefined;
        if (imageFile) {
          const uploaded = await locationsApi.uploadFile(editLocation.id, imageFile);
          imageUrl = uploaded.downloadUrl;
        }
        await locationsApi.update(editLocation.id, { ...payload, imageUrl });
        locationId = editLocation.id;
      } else {
        const created = await locationsApi.create(payload);
        locationId = created.id;
        if (imageFile) {
          const uploaded = await locationsApi.uploadFile(locationId, imageFile);
          await locationsApi.update(locationId, { ...payload, imageUrl: uploaded.downloadUrl });
        }
      }
      setDirty(false);
      onSaved();
      onClose();
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : `No se pudo ${isEditMode ? 'guardar' : 'crear'} la ubicación`);
    } finally {
      setSubmitting(false);
    }
  }

  const selectableParents = allLocations.filter((l) => !editLocation || l.id !== editLocation.id);

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <form onSubmit={handleSubmit}>
        <DialogTitle>{isEditMode ? 'Editar ubicación' : 'Agregar ubicación'}</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 2.5 }} onChange={() => setDirty(true)}>
          {error && <Alert severity="error">{error}</Alert>}

          <TextField label="Nombre" value={name} onChange={(e) => setName(e.target.value)} required fullWidth autoFocus />
          <TextField label="Dirección" value={address} onChange={(e) => setAddress(e.target.value)} fullWidth />

          <Box sx={{ display: 'flex', gap: 2 }}>
            <TextField label="Latitud" type="number" value={latitude} onChange={(e) => setLatitude(e.target.value)} fullWidth />
            <TextField label="Longitud" type="number" value={longitude} onChange={(e) => setLongitude(e.target.value)} fullWidth />
          </Box>

          <TextField select label="Ubicación padre" value={parentLocationId} onChange={(e) => setParentLocationId(e.target.value)} fullWidth>
            <MenuItem value="">— Ninguna —</MenuItem>
            {selectableParents.map((l) => (
              <MenuItem key={l.id} value={l.id}>
                {l.name}
              </MenuItem>
            ))}
          </TextField>

          <TextField
            select
            label="Personas asignadas"
            value={assignedUserIds}
            onChange={multiSelectChange(setAssignedUserIds)}
            SelectProps={{ multiple: true }}
            fullWidth
          >
            {users.map((u) => (
              <MenuItem key={u.id} value={String(u.id)}>
                {u.fullName || u.email}
              </MenuItem>
            ))}
          </TextField>

          <TextField select label="Contratistas" value={vendorIds} onChange={multiSelectChange(setVendorIds)} SelectProps={{ multiple: true }} fullWidth>
            {vendors.map((v) => (
              <MenuItem key={v.id} value={String(v.id)}>
                {v.companyName}
              </MenuItem>
            ))}
          </TextField>

          <TextField select label="Equipos" value={teamIds} onChange={multiSelectChange(setTeamIds)} SelectProps={{ multiple: true }} fullWidth>
            {teams.map((t) => (
              <MenuItem key={t.id} value={String(t.id)}>
                {t.name}
              </MenuItem>
            ))}
          </TextField>

          <Box>
            <Button component="label" variant="outlined" size="small">
              {imageFile || existingImageUrl ? 'Cambiar imagen' : 'Agregar imagen'}
              <input
                type="file"
                accept="image/*"
                hidden
                onChange={(e) => {
                  setImageFile(e.target.files?.[0] ?? null);
                  setDirty(true);
                }}
              />
            </Button>
            {(imageFile || existingImageUrl) && (
              <Box sx={{ mt: 1 }}>
                <img
                  src={imageFile ? URL.createObjectURL(imageFile) : existingImageUrl!}
                  alt="Vista previa"
                  style={{ maxHeight: 100, borderRadius: 8 }}
                />
              </Box>
            )}
          </Box>
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
