import { useEffect, useState } from 'react';
import { Dialog, DialogTitle, DialogContent, Box, TextField, Autocomplete, Button, Typography, Alert } from '@mui/material';
import { teamsApi } from '../api/teams';
import { usersApi, type UserMini } from '../api/users';
import { assetsApi } from '../api/assets';
import { locationsApi } from '../api/locations';
import { partsApi } from '../api/parts';
import type { AssetResponse, LocationSummary, PartSummary } from '../types';
import { ApiRequestError } from '../api/client';

interface Props {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
}

// Copia fiel de RenderTeamsAddModal (Teams.tsx real): Dialog fullWidth
// maxWidth="md", nombre + descripcion + personas. Aca es donde tambien se
// pueden asignar activos/ubicaciones/repuestos -- solo al crear.
export default function CreateTeamDialog({ open, onClose, onCreated }: Props) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [users, setUsers] = useState<UserMini[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<UserMini[]>([]);
  const [assets, setAssets] = useState<AssetResponse[]>([]);
  const [selectedAssets, setSelectedAssets] = useState<AssetResponse[]>([]);
  const [locations, setLocations] = useState<LocationSummary[]>([]);
  const [selectedLocations, setSelectedLocations] = useState<LocationSummary[]>([]);
  const [parts, setParts] = useState<PartSummary[]>([]);
  const [selectedParts, setSelectedParts] = useState<PartSummary[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) return;
    usersApi.mini().then(setUsers).catch(() => setUsers([]));
    assetsApi.list({ size: 100 }).then((r) => setAssets(r.content)).catch(() => setAssets([]));
    locationsApi.list().then(setLocations).catch(() => setLocations([]));
    partsApi.list().then(setParts).catch(() => setParts([]));
    setName('');
    setDescription('');
    setSelectedUsers([]);
    setSelectedAssets([]);
    setSelectedLocations([]);
    setSelectedParts([]);
    setError(null);
  }, [open]);

  async function handleSubmit() {
    if (!name.trim()) return;
    setSubmitting(true);
    setError(null);
    try {
      await teamsApi.create(
        name.trim(),
        description.trim() || undefined,
        selectedUsers.map((u) => u.id),
        selectedAssets.map((a) => a.id),
        selectedLocations.map((l) => l.id),
        selectedParts.map((p) => p.id),
      );
      onCreated();
      onClose();
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : 'No se pudo crear el equipo');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog fullWidth maxWidth="md" open={open} onClose={onClose}>
      <DialogTitle sx={{ p: 3 }}>
        <Typography variant="h4" gutterBottom>
          Crear equipo
        </Typography>
        <Typography variant="subtitle2">Un equipo agrupa personas y puede ser responsable de ciertos activos y ubicaciones.</Typography>
      </DialogTitle>
      <DialogContent dividers sx={{ p: 3, display: 'flex', flexDirection: 'column', gap: 2 }}>
        <TextField label="Nombre" value={name} onChange={(e) => setName(e.target.value)} required fullWidth autoFocus />
        <TextField label="Descripción" value={description} onChange={(e) => setDescription(e.target.value)} fullWidth multiline minRows={2} />
        <Autocomplete
          multiple
          options={users}
          getOptionLabel={(u) => `${u.fullName}`}
          value={selectedUsers}
          onChange={(_, v) => setSelectedUsers(v)}
          renderInput={(params) => <TextField {...params} label="Personas en el equipo" />}
        />
        <Autocomplete
          multiple
          options={assets}
          getOptionLabel={(a) => a.name}
          value={selectedAssets}
          onChange={(_, v) => setSelectedAssets(v)}
          renderInput={(params) => <TextField {...params} label="Activos" />}
        />
        <Autocomplete
          multiple
          options={locations}
          getOptionLabel={(l) => l.name}
          value={selectedLocations}
          onChange={(_, v) => setSelectedLocations(v)}
          renderInput={(params) => <TextField {...params} label="Ubicaciones" />}
        />
        <Autocomplete
          multiple
          options={parts}
          getOptionLabel={(p) => p.name}
          value={selectedParts}
          onChange={(_, v) => setSelectedParts(v)}
          renderInput={(params) => <TextField {...params} label="Repuestos" />}
        />
        {error && <Alert severity="error">{error}</Alert>}
        <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1 }}>
          <Button onClick={onClose}>Cancelar</Button>
          <Button variant="contained" onClick={handleSubmit} disabled={!name.trim() || submitting}>
            {submitting ? 'Creando…' : 'Enviar'}
          </Button>
        </Box>
      </DialogContent>
    </Dialog>
  );
}
