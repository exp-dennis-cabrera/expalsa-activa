import { useEffect, useState } from 'react';
import {
  Box,
  Typography,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  TableContainer,
  Paper,
  Alert,
  Chip,
  Button,
  Stack,
  TextField,
  Switch,
  InputAdornment,
  IconButton,
  Tooltip,
  TablePagination,
} from '@mui/material';
import EditTwoToneIcon from '@mui/icons-material/EditTwoTone';
import CancelIcon from '@mui/icons-material/Cancel';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import SearchIcon from '@mui/icons-material/SearchRounded';
import AccessTimeIcon from '@mui/icons-material/AccessTimeRounded';
import InviteUsersDialog from './InviteUsersDialog';
import EditPersonDialog from './EditPersonDialog';
import ShiftConfigDialog from './ShiftConfigDialog';
import UserDetailDrawer from './UserDetailDrawer';
import ConfirmDialog from './ConfirmDialog';
import { usersApi, type PendingInvitation } from '../api/users';
import { useAuth } from '../context/AuthContext';
import type { UserSummary } from '../types';
import { ApiRequestError } from '../api/client';
import { useDispatch, useSelector } from '../store';
import { getUsers } from '../slices/user';
import { ROLE_LABELS } from '../constants';

interface Props {
  inviteOpen: boolean;
  onInviteClose: () => void;
}

// Copia fiel de People.tsx real: click en una fila abre un Drawer lateral
// (no un Dialog, a diferencia de Equipos); editar es un Dialog separado;
// deshabilitar/habilitar necesitan confirmacion; toda la columna de
// acciones se oculta si el rol no tiene editOtherPermissions.
export default function PeopleTab({ inviteOpen, onInviteClose }: Props) {
  const { hasEditPermission } = useAuth();
  const dispatch = useDispatch();
  const { users: usersPage, loadingGet } = useSelector((state) => state.users);
  const users = usersPage.content as unknown as UserSummary[];
  const [totalElements, setTotalElements] = useState(0);
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const [search, setSearch] = useState('');
  const [enabledOnly, setEnabledOnly] = useState(true);
  const [pendingInvitations, setPendingInvitations] = useState<PendingInvitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedUser, setSelectedUser] = useState<UserSummary | null>(null);
  const [editingUser, setEditingUser] = useState<UserSummary | null>(null);
  const [shiftUser, setShiftUser] = useState<UserSummary | null>(null);
  const [disablingUser, setDisablingUser] = useState<UserSummary | null>(null);
  const [enablingUser, setEnablingUser] = useState<UserSummary | null>(null);
  const [resending, setResending] = useState(false);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      // El listado vive en el store, igual que en Atlas.
      dispatch(getUsers({ page, size: pageSize, search: search || undefined, enabledOnly }));
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : 'No se pudieron cargar las personas');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, pageSize, search, enabledOnly]);

  useEffect(() => {
    usersApi.lastWeekInvitations().then(setPendingInvitations).catch(() => {});
  }, []);

  async function handleResendInvites() {
    setResending(true);
    setError(null);
    try {
      await Promise.all(pendingInvitations.map((inv) => usersApi.invite([inv.email], inv.roleId)));
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : 'No se pudieron reenviar las invitaciones');
    } finally {
      setResending(false);
    }
  }

  async function handleDisable() {
    if (!disablingUser) return;
    try {
      await usersApi.disable(disablingUser.id);
      setDisablingUser(null);
      load();
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : 'No se pudo deshabilitar');
      setDisablingUser(null);
    }
  }

  async function handleEnable() {
    if (!enablingUser) return;
    try {
      await usersApi.enable(enablingUser.id);
      setEnablingUser(null);
      load();
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : 'No se pudo habilitar');
      setEnablingUser(null);
    }
  }

  return (
    <Box>
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
        <TextField
          size="small"
          placeholder="Buscar…"
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(0); }}
          InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment> }}
          sx={{ width: 260 }}
        />
        <Stack direction="row" alignItems="center" spacing={1}>
          <Typography variant="body2">Solo habilitados</Typography>
          <Switch checked={enabledOnly} onChange={() => { setEnabledOnly((v) => !v); setPage(0); }} />
        </Stack>
      </Stack>

      {pendingInvitations.length > 0 && (
        <Box sx={{ mb: 2, p: 2, bgcolor: 'info.light', color: 'info.contrastText', borderRadius: 1 }}>
          <Stack direction="row" justifyContent="space-between" alignItems="center">
            <Typography variant="subtitle2">
              {pendingInvitations.length === 1
                ? `${pendingInvitations[0].email} — ${ROLE_LABELS[pendingInvitations[0].roleName] ?? pendingInvitations[0].roleName}`
                : `${pendingInvitations.length} invitaciones pendientes`}
            </Typography>
            <Button onClick={handleResendInvites} variant="contained" color="secondary" size="small" disabled={resending}>
              {resending ? 'Reenviando…' : 'Reenviar invitaciones'}
            </Button>
          </Stack>
        </Box>
      )}

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {loading ? (
        <Typography sx={{ color: 'text.secondary', textAlign: 'center', py: 6 }}>Cargando…</Typography>
      ) : (
        <TableContainer component={Paper} variant="outlined">
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Nombre</TableCell>
                <TableCell>Email</TableCell>
                <TableCell>Teléfono</TableCell>
                <TableCell>Puesto</TableCell>
                <TableCell>Rol</TableCell>
                <TableCell>Tarifa por hora</TableCell>
                <TableCell align="right">Acciones</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {users.map((u) => {
                const disabled = u.status === 'DISABLED';
                const canEdit = hasEditPermission('PEOPLE_AND_TEAMS', { createdById: null, assignedUserIds: [] });
                return (
                  <TableRow key={u.id} hover onClick={() => setSelectedUser(u)} sx={{ cursor: 'pointer' }}>
                    <TableCell sx={{ fontWeight: 700, color: disabled ? 'text.disabled' : 'inherit' }}>
                      {u.fullName || '—'} {disabled && '(Deshabilitado)'}
                    </TableCell>
                    <TableCell>{u.email}</TableCell>
                    <TableCell>{u.phone ?? '—'}</TableCell>
                    <TableCell>{u.jobTitle ?? '—'}</TableCell>
                    <TableCell>
                      <Chip label={u.roleName ? ROLE_LABELS[u.roleName] ?? u.roleName : '—'} size="small" variant="outlined" />
                    </TableCell>
                    <TableCell>{u.hourlyRate != null ? `$${u.hourlyRate.toFixed(2)}` : '—'}</TableCell>
                    <TableCell align="right" onClick={(e) => e.stopPropagation()}>
                      {canEdit && (
                        <>
                          <Tooltip title="Editar">
                            <IconButton size="small" onClick={() => setEditingUser(u)}>
                              <EditTwoToneIcon fontSize="small" color="primary" />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Configurar turno">
                            <IconButton size="small" onClick={() => setShiftUser(u)}>
                              <AccessTimeIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          {!disabled && (
                            <Tooltip title="Deshabilitar">
                              <IconButton size="small" onClick={() => setDisablingUser(u)}>
                                <CancelIcon fontSize="small" color="error" />
                              </IconButton>
                            </Tooltip>
                          )}
                          {disabled && (
                            <Tooltip title="Habilitar">
                              <IconButton size="small" onClick={() => setEnablingUser(u)}>
                                <CheckCircleIcon fontSize="small" color="success" />
                              </IconButton>
                            </Tooltip>
                          )}
                        </>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
          <TablePagination
            component="div"
            count={totalElements}
            page={page}
            onPageChange={(_, p) => setPage(p)}
            rowsPerPage={pageSize}
            onRowsPerPageChange={(e) => { setPageSize(Number(e.target.value)); setPage(0); }}
            rowsPerPageOptions={[10, 20, 50]}
            labelRowsPerPage="Filas por página"
          />
        </TableContainer>
      )}

      <UserDetailDrawer user={selectedUser} onClose={() => setSelectedUser(null)} />
      <InviteUsersDialog open={inviteOpen} onClose={onInviteClose} onInvited={load} />
      <EditPersonDialog user={editingUser} onClose={() => setEditingUser(null)} onSaved={load} />
      <ShiftConfigDialog
        userId={shiftUser?.id ?? null}
        userName={shiftUser?.fullName ?? ''}
        onClose={() => setShiftUser(null)}
      />
      <ConfirmDialog
        open={!!disablingUser}
        onCancel={() => setDisablingUser(null)}
        onConfirm={handleDisable}
        confirmText="Deshabilitar"
        question={`¿Deshabilitar a "${disablingUser?.fullName}"?`}
      />
      <ConfirmDialog
        open={!!enablingUser}
        onCancel={() => setEnablingUser(null)}
        onConfirm={handleEnable}
        confirmText="Habilitar"
        question={`¿Habilitar a "${enablingUser?.fullName}"?`}
      />
    </Box>
  );
}
