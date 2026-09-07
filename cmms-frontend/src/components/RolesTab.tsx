import { useEffect, useState } from 'react';
import { Box, Typography, Button, Table, TableHead, TableBody, TableRow, TableCell, TableContainer, Paper, Alert, IconButton, Tooltip } from '@mui/material';
import AddIcon from '@mui/icons-material/AddRounded';
import EditIcon from '@mui/icons-material/EditTwoTone';
import DeleteIcon from '@mui/icons-material/DeleteTwoTone';
import RoleFormDialog from './RoleFormDialog';
import RoleDetailDrawer from './RoleDetailDrawer';
import ConfirmDialog from './ConfirmDialog';
import { rolesApi, type RoleResponse } from '../api/roles';
import { ApiRequestError } from '../api/client';
import { useDispatch, useSelector } from '../store';
import { getRoles } from '../slices/role';

// Copia fiel de Settings/Roles/index.tsx real: click en una fila abre un
// Drawer lateral con el detalle (matriz de solo lectura); editar/eliminar
// solo estan disponibles para roles personalizados (code === 'USER_CREATED').
export default function RolesTab() {
  const dispatch = useDispatch();
  const { roles, loadingGet } = useSelector((state) => state.roles);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingRole, setEditingRole] = useState<RoleResponse | null>(null);
  const [selectedRole, setSelectedRole] = useState<RoleResponse | null>(null);
  const [deletingRole, setDeletingRole] = useState<RoleResponse | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      dispatch(getRoles());
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : 'No se pudieron cargar los roles');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function handleDelete() {
    if (!deletingRole) return;
    try {
      await rolesApi.delete(deletingRole.id);
      setDeletingRole(null);
      setSelectedRole(null);
      load();
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : 'No se pudo eliminar el rol');
      setDeletingRole(null);
    }
  }

  function isCustomRole(role: RoleResponse) {
    return role.code === 'USER_CREATED';
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
          Configura qué puede hacer cada rol en cada módulo. Los roles del sistema (Admin, Técnico, etc.) no se pueden editar.
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => {
            setEditingRole(null);
            setDialogOpen(true);
          }}
        >
          Rol
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {loading ? (
        <Typography sx={{ color: 'text.secondary', textAlign: 'center', py: 6 }}>Cargando roles…</Typography>
      ) : (
        <TableContainer component={Paper} variant="outlined">
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Nombre</TableCell>
                <TableCell>Usuarios</TableCell>
                <TableCell>Descripción</TableCell>
                <TableCell align="right">Acciones</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {roles.map((role) => (
                <TableRow key={role.id} hover onClick={() => setSelectedRole(role)} sx={{ cursor: 'pointer' }}>
                  <TableCell sx={{ fontWeight: 500 }}>{role.name}</TableCell>
                  <TableCell>{role.usersCount}</TableCell>
                  <TableCell sx={{ color: 'text.secondary' }}>{role.description ?? '—'}</TableCell>
                  <TableCell align="right" onClick={(e) => e.stopPropagation()}>
                    {isCustomRole(role) ? (
                      <>
                        <Tooltip title="Editar">
                          <IconButton size="small" onClick={() => { setEditingRole(role); setDialogOpen(true); }}>
                            <EditIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Eliminar">
                          <IconButton size="small" onClick={() => setDeletingRole(role)}>
                            <DeleteIcon fontSize="small" color="error" />
                          </IconButton>
                        </Tooltip>
                      </>
                    ) : (
                      <Typography variant="caption" sx={{ color: 'text.disabled' }}>
                        Rol del sistema
                      </Typography>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      <RoleDetailDrawer
        role={selectedRole}
        onClose={() => setSelectedRole(null)}
        onEdit={(role) => {
          setSelectedRole(null);
          setEditingRole(role);
          setDialogOpen(true);
        }}
        onDelete={(role) => setDeletingRole(role)}
      />

      <RoleFormDialog open={dialogOpen} editRole={editingRole} onClose={() => setDialogOpen(false)} onSaved={load} />

      <ConfirmDialog
        open={!!deletingRole}
        onCancel={() => setDeletingRole(null)}
        onConfirm={handleDelete}
        confirmText="Eliminar"
        question={`¿Eliminar el rol "${deletingRole?.name}"? Esta acción no se puede deshacer.`}
      />
    </Box>
  );
}
