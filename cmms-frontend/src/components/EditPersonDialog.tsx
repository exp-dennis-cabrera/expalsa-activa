import { useEffect, useState } from 'react';
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, TextField, MenuItem, Typography, Alert } from '@mui/material';
import { usersApi } from '../api/users';
import { rolesApi, type RoleResponse } from '../api/roles';
import { useAuth } from '../context/AuthContext';
import type { UserSummary } from '../types';
import { ApiRequestError } from '../api/client';
import { ROLE_LABELS } from '../constants';

interface Props {
  user: UserSummary | null;
  onClose: () => void;
  onSaved: () => void;
}

// Copia fiel de renderEditUserModal (People.tsx real): SOLO tarifa por
// hora y rol -- nada de telefono/puesto (eso lo edita cada quien en su
// propio perfil). El campo "Rol" se oculta si estás editando tu propia
// cuenta (nadie se cambia el rol a sí mismo desde acá). Al guardar, la
// tarifa y el rol se mandan como 2 llamadas separadas, igual que el real.
export default function EditPersonDialog({ user, onClose, onSaved }: Props) {
  const { userId } = useAuth();
  const [hourlyRate, setHourlyRate] = useState('');
  const [roleId, setRoleId] = useState('');
  const [originalRoleId, setOriginalRoleId] = useState('');
  const [roles, setRoles] = useState<RoleResponse[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const isEditingSelf = user != null && userId === user.id;

  useEffect(() => {
    if (user) {
      setHourlyRate(user.hourlyRate != null ? String(user.hourlyRate) : '');
      setError(null);
      rolesApi.list().then((list) => {
        setRoles(list);
        const match = list.find((r) => r.name === user.roleName);
        setRoleId(match ? String(match.id) : '');
        setOriginalRoleId(match ? String(match.id) : '');
      }).catch(() => setRoles([]));
    }
  }, [user]);

  async function handleSave() {
    if (!user) return;
    setSubmitting(true);
    setError(null);
    try {
      await usersApi.update(user.id, {
        hourlyRate: hourlyRate ? Number(hourlyRate) : undefined,
      });
      if (!isEditingSelf && roleId && roleId !== originalRoleId) {
        await usersApi.updateRole(user.id, Number(roleId));
      }
      onSaved();
      onClose();
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : 'No se pudo guardar');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={!!user} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ p: 3 }}>
        <Typography variant="h4" gutterBottom>
          Editar persona
        </Typography>
        <Typography variant="subtitle2">Cambiá la tarifa por hora o el rol de esta persona.</Typography>
      </DialogTitle>
      <DialogContent dividers sx={{ display: 'flex', flexDirection: 'column', gap: 2, p: 3 }}>
        {error && <Alert severity="error">{error}</Alert>}
        <TextField
          label="Tarifa por hora"
          type="number"
          value={hourlyRate}
          onChange={(e) => setHourlyRate(e.target.value)}
          inputProps={{ min: 0, step: 0.5 }}
          fullWidth
        />
        {!isEditingSelf && (
          <TextField select label="Rol" value={roleId} onChange={(e) => setRoleId(e.target.value)} fullWidth>
            {roles.map((r) => (
              <MenuItem key={r.id} value={r.id}>
                {ROLE_LABELS[r.name] ?? r.name}
              </MenuItem>
            ))}
          </TextField>
        )}
      </DialogContent>
      <DialogActions sx={{ p: 2 }}>
        <Button onClick={onClose} color="inherit">
          Cancelar
        </Button>
        <Button variant="contained" onClick={handleSave} disabled={submitting}>
          {submitting ? 'Guardando…' : 'Guardar'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
