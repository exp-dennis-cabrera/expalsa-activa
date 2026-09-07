import { Drawer, Box, Typography, IconButton, Tooltip, Grid } from '@mui/material';
import EditIcon from '@mui/icons-material/EditTwoTone';
import DeleteIcon from '@mui/icons-material/DeleteTwoTone';
import PermissionsMatrix from './PermissionsMatrix';
import type { RoleResponse } from '../api/roles';

interface Props {
  role: RoleResponse | null;
  onClose: () => void;
  onEdit: (role: RoleResponse) => void;
  onDelete: (role: RoleResponse) => void;
}

// Copia fiel de RoleDetails.tsx real: Drawer desde la derecha, nombre +
// descripcion, editar/eliminar SOLO si es un rol personalizado
// (code === 'USER_CREATED') -- los roles del sistema (ADMIN, TECHNICIAN,
// etc.) no se pueden tocar desde aca. Matriz de permisos en solo lectura.
export default function RoleDetailDrawer({ role, onClose, onEdit, onDelete }: Props) {
  const isCustomRole = role?.code === 'USER_CREATED';

  return (
    <Drawer anchor="right" open={!!role} onClose={onClose} PaperProps={{ sx: { width: { xs: '90%', sm: '70%', md: '50%' } } }}>
      {role && (
        <Grid container justifyContent="center" alignItems="stretch" spacing={2} padding={4}>
          <Grid item xs={12} display="flex" flexDirection="row" justifyContent="space-between">
            <Box>
              <Typography variant="h4">{role.name}</Typography>
              <Typography variant="subtitle1" sx={{ color: 'text.secondary' }}>
                {role.description}
              </Typography>
            </Box>
            {isCustomRole && (
              <Box>
                <Tooltip title="Editar rol">
                  <IconButton sx={{ mr: 1 }} onClick={() => onEdit(role)}>
                    <EditIcon color="primary" />
                  </IconButton>
                </Tooltip>
                <Tooltip title="Eliminar rol">
                  <IconButton onClick={() => onDelete(role)}>
                    <DeleteIcon color="error" />
                  </IconButton>
                </Tooltip>
              </Box>
            )}
          </Grid>

          <Grid item xs={12}>
            <Typography variant="h5" sx={{ mt: 2, mb: 2 }}>
              Permisos
            </Typography>
            <PermissionsMatrix
              values={{
                viewPermissions: role.viewPermissions,
                viewOtherPermissions: role.viewOtherPermissions,
                createPermissions: role.createPermissions,
                editOtherPermissions: role.editOtherPermissions,
                deleteOtherPermissions: role.deleteOtherPermissions,
              }}
            />
          </Grid>
        </Grid>
      )}
    </Drawer>
  );
}
