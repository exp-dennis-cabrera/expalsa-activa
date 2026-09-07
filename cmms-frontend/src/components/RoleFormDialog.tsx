import { useEffect, useState } from 'react';
import { Dialog, DialogTitle, DialogContent, DialogActions, TextField, Button, Typography, Alert } from '@mui/material';
import PermissionsMatrix from './PermissionsMatrix';
import { rolesApi, type PermissionEntity, type RoleResponse } from '../api/roles';
import { ApiRequestError } from '../api/client';

type PermissionRoot = 'viewPermissions' | 'viewOtherPermissions' | 'createPermissions' | 'editOtherPermissions' | 'deleteOtherPermissions';

interface Props {
  open: boolean;
  editRole: RoleResponse | null;
  onClose: () => void;
  onSaved: () => void;
}

// Copia fiel de EditRole.tsx real: Dialog con nombre + PermissionsMatrix.
export default function RoleFormDialog({ open, editRole, onClose, onSaved }: Props) {
  const isEditMode = !!editRole;
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [permissions, setPermissions] = useState<Record<PermissionRoot, PermissionEntity[]>>({
    viewPermissions: [],
    viewOtherPermissions: [],
    createPermissions: [],
    editOtherPermissions: [],
    deleteOtherPermissions: [],
  });
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) return;
    if (editRole) {
      setName(editRole.name);
      setDescription(editRole.description ?? '');
      setPermissions({
        viewPermissions: editRole.viewPermissions,
        viewOtherPermissions: editRole.viewOtherPermissions,
        createPermissions: editRole.createPermissions,
        editOtherPermissions: editRole.editOtherPermissions,
        deleteOtherPermissions: editRole.deleteOtherPermissions,
      });
    } else {
      setName('');
      setDescription('');
      setPermissions({ viewPermissions: [], viewOtherPermissions: [], createPermissions: [], editOtherPermissions: [], deleteOtherPermissions: [] });
    }
    setError(null);
  }, [open, editRole]);

  function handleToggle(root: PermissionRoot, entity: PermissionEntity, checked: boolean) {
    setPermissions((prev) => ({
      ...prev,
      [root]: checked ? [...prev[root], entity] : prev[root].filter((e) => e !== entity),
    }));
  }

  async function handleSubmit() {
    if (!name.trim()) return;
    setSubmitting(true);
    setError(null);
    try {
      const payload = { name: name.trim(), description: description.trim() || undefined, ...permissions };
      if (isEditMode) {
        await rolesApi.update(editRole!.id, payload);
      } else {
        await rolesApi.create(payload);
      }
      onSaved();
      onClose();
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : `No se pudo ${isEditMode ? 'guardar' : 'crear'} el rol`);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog fullWidth maxWidth="md" open={open} onClose={onClose}>
      <DialogTitle sx={{ p: 3 }}>
        <Typography variant="h4" gutterBottom>
          {isEditMode ? 'Editar rol' : 'Nuevo rol'}
        </Typography>
        <Typography variant="subtitle2">Configura qué puede hacer este rol en cada módulo.</Typography>
      </DialogTitle>
      <DialogContent dividers sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        <TextField label="Nombre" value={name} onChange={(e) => setName(e.target.value)} required fullWidth autoFocus />
        <TextField label="Descripción" value={description} onChange={(e) => setDescription(e.target.value)} fullWidth multiline minRows={2} />
        <PermissionsMatrix values={permissions} onChange={handleToggle} />
        {error && <Alert severity="error">{error}</Alert>}
      </DialogContent>
      <DialogActions sx={{ p: 2 }}>
        <Button onClick={onClose}>Cancelar</Button>
        <Button variant="contained" onClick={handleSubmit} disabled={!name.trim() || submitting}>
          {submitting ? 'Guardando…' : 'Guardar'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
