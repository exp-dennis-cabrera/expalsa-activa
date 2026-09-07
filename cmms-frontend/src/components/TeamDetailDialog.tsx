import { useEffect, useState } from 'react';
import { Dialog, DialogTitle, DialogContent, Box, Typography, IconButton, TextField, Autocomplete, Button, Alert, Link } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import { teamsApi } from '../api/teams';
import { usersApi, type UserMini } from '../api/users';
import { useAuth } from '../context/AuthContext';
import type { TeamResponse } from '../types';
import { ApiRequestError } from '../api/client';

interface Props {
  open: boolean;
  team: TeamResponse | null;
  onClose: () => void;
  onSaved: () => void;
  onRequestDelete: (team: TeamResponse) => void;
}

// Copia fiel de ModalTeamDetails (Teams.tsx real): Dialog centrado,
// "Editar"/"Volver" y "Eliminar" arriba a la izquierda (solo si el
// permiso corresponde), X para cerrar arriba a la derecha. En modo
// edicion, SOLO se puede cambiar nombre, descripcion y personas.
export default function TeamDetailDialog({ open, team, onClose, onSaved, onRequestDelete }: Props) {
  const { hasEditPermission, hasDeletePermission } = useAuth();
  const [mode, setMode] = useState<'view' | 'update'>('view');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [users, setUsers] = useState<UserMini[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<UserMini[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open || !team) return;
    setMode('view');
    setName(team.name);
    setDescription(team.description ?? '');
    setSelectedUsers(team.members);
    setError(null);
    usersApi.mini().then(setUsers).catch(() => setUsers([]));
  }, [open, team]);

  async function handleSubmit() {
    if (!team || !name.trim()) return;
    setSubmitting(true);
    setError(null);
    try {
      await teamsApi.update(team.id, name.trim(), description.trim() || undefined, selectedUsers.map((u) => u.id));
      onSaved();
      setMode('view');
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : 'No se pudo editar el equipo');
    } finally {
      setSubmitting(false);
    }
  }

  if (!team) return null;

  const canEdit = hasEditPermission('PEOPLE_AND_TEAMS', { createdById: team.createdById });
  const canDelete = hasDeletePermission('PEOPLE_AND_TEAMS', { createdById: team.createdById });

  return (
    <Dialog fullWidth maxWidth="sm" open={open} onClose={onClose}>
      <DialogTitle sx={{ p: 3, display: 'flex', flexDirection: 'row', justifyContent: 'space-between' }}>
        <Box sx={{ display: 'flex', flexDirection: 'row' }}>
          {mode === 'view' ? (
            canEdit && (
              <Typography onClick={() => setMode('update')} sx={{ cursor: 'pointer' }} variant="subtitle1" mr={2}>
                Editar
              </Typography>
            )
          ) : (
            <Typography onClick={() => setMode('view')} sx={{ cursor: 'pointer' }} variant="subtitle1" mr={2}>
              Volver
            </Typography>
          )}
          {canDelete && (
            <Typography
              variant="subtitle1"
              sx={{ cursor: 'pointer' }}
              onClick={() => {
                onClose();
                onRequestDelete(team);
              }}
            >
              Eliminar
            </Typography>
          )}
        </Box>
        <IconButton aria-label="close" onClick={onClose} sx={{ position: 'absolute', right: 8, top: 8, color: (theme) => theme.palette.grey[500] }}>
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent dividers sx={{ p: 3 }}>
        {mode === 'view' ? (
          <Box>
            <Typography variant="subtitle1">Nombre</Typography>
            <Typography variant="h5" sx={{ mb: 1 }}>
              {team.name}
            </Typography>
            {team.description && (
              <>
                <Typography variant="subtitle1">Descripción</Typography>
                <Typography variant="h5" sx={{ mb: 1 }}>
                  {team.description}
                </Typography>
              </>
            )}
            <Typography variant="subtitle1">Miembros</Typography>
            {team.members.length ? (
              team.members.map((user) => (
                <Box key={user.id}>
                  <Link href={`/people?id=${user.id}`} variant="h6">
                    {user.fullName}
                  </Link>
                </Box>
              ))
            ) : (
              <Typography sx={{ color: 'text.secondary' }}>Sin miembros.</Typography>
            )}
          </Box>
        ) : (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <TextField label="Nombre" value={name} onChange={(e) => setName(e.target.value)} required fullWidth autoFocus />
            <TextField label="Descripción" value={description} onChange={(e) => setDescription(e.target.value)} fullWidth multiline minRows={2} />
            <Autocomplete
              multiple
              options={users}
              getOptionLabel={(u) => u.fullName}
              value={selectedUsers}
              isOptionEqualToValue={(a, b) => a.id === b.id}
              onChange={(_, v) => setSelectedUsers(v)}
              renderInput={(params) => <TextField {...params} label="Personas en el equipo" />}
            />
            {error && <Alert severity="error">{error}</Alert>}
            <Button variant="contained" onClick={handleSubmit} disabled={!name.trim() || submitting}>
              {submitting ? 'Guardando…' : 'Guardar'}
            </Button>
          </Box>
        )}
      </DialogContent>
    </Dialog>
  );
}
