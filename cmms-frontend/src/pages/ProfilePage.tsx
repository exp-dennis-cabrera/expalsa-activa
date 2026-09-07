import { useEffect, useRef, useState } from 'react';
import {
  Box,
  Typography,
  Paper,
  Avatar,
  IconButton,
  Grid,
  Button,
  Switch,
  Divider,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Alert,
  CircularProgress,
} from '@mui/material';
import UploadRoundedIcon from '@mui/icons-material/UploadRounded';
import EditTwoToneIcon from '@mui/icons-material/EditTwoTone';
import LockTwoToneIcon from '@mui/icons-material/LockTwoTone';
import AssignmentTwoToneIcon from '@mui/icons-material/AssignmentTwoTone';
import MfaSettingsSection from '../components/MfaSettingsSection';
import { meApi, type MyProfile, type MySettings, type WorkOrdersOverview } from '../api/me';
import { ApiRequestError } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

export default function ProfilePage() {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [profile, setProfile] = useState<MyProfile | null>(null);
  const [settings, setSettings] = useState<MySettings | null>(null);
  const [overview, setOverview] = useState<WorkOrdersOverview | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [editOpen, setEditOpen] = useState(false);
  const [editFirstName, setEditFirstName] = useState('');
  const [editLastName, setEditLastName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editJobTitle, setEditJobTitle] = useState('');
  const [savingEdit, setSavingEdit] = useState(false);

  const [passwordOpen, setPasswordOpen] = useState(false);
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [savingPassword, setSavingPassword] = useState(false);

  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  async function load() {
    try {
      const [p, s, o] = await Promise.all([meApi.get(), meApi.getSettings(), meApi.getWorkOrdersOverview()]);
      setProfile(p);
      setSettings(s);
      setOverview(o);
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : 'No se pudo cargar el perfil');
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const updated = await meApi.uploadAvatar(file);
      setProfile(updated);
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : 'No se pudo subir la imagen');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }

  function openEdit() {
    setEditFirstName(profile?.firstName ?? '');
    setEditLastName(profile?.lastName ?? '');
    setEditPhone(profile?.phone ?? '');
    setEditJobTitle(profile?.jobTitle ?? '');
    setEditOpen(true);
  }

  async function handleSaveEdit() {
    if (!profile) return;
    setSavingEdit(true);
    try {
      const updated = await meApi.update(profile.id, {
        firstName: editFirstName,
        lastName: editLastName,
        phone: editPhone,
        jobTitle: editJobTitle,
      });
      setProfile(updated);
      setEditOpen(false);
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : 'No se pudo guardar');
    } finally {
      setSavingEdit(false);
    }
  }

  async function handleChangePassword() {
    setPasswordError(null);
    if (newPassword !== confirmPassword) {
      setPasswordError('Las contraseñas no coinciden');
      return;
    }
    setSavingPassword(true);
    try {
      await meApi.changePassword(oldPassword, newPassword);
      setPasswordOpen(false);
      setOldPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      setPasswordError(err instanceof ApiRequestError ? err.message : 'Contraseña actual incorrecta');
    } finally {
      setSavingPassword(false);
    }
  }

  async function handleToggleSetting(key: keyof MySettings) {
    if (!settings) return;
    const updated = { ...settings, [key]: !settings[key] };
    setSettings(updated);
    try {
      await meApi.updateSettings({ [key]: updated[key] });
    } catch {
      load();
    }
  }

  async function handleDeleteAccount() {
    setDeleteError(null);
    try {
      await meApi.deleteAccount();
      logout();
      navigate('/login');
    } catch (err) {
      setDeleteError(err instanceof ApiRequestError ? err.message : 'No se pudo eliminar la cuenta');
    }
  }

  if (!profile) {
    return (
      <>
        {error ? (
          <Typography sx={{ color: 'error.main' }}>{error}</Typography>
        ) : (
          <Typography sx={{ color: 'text.secondary' }}>Cargando…</Typography>
        )}
      </>
    );
  }

  return (
    <>
      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} md={4}>
          <Paper variant="outlined" sx={{ p: 3, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <Box sx={{ position: 'relative' }}>
              <Avatar src={profile.avatarUrl ?? undefined} sx={{ width: 120, height: 120, fontSize: 40 }}>
                {profile.firstName?.[0]?.toUpperCase() ?? '?'}
              </Avatar>
              <input ref={fileInputRef} type="file" accept="image/*" hidden onChange={handleAvatarChange} />
              <IconButton
                size="small"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                sx={{
                  position: 'absolute',
                  bottom: 0,
                  right: 0,
                  bgcolor: 'primary.main',
                  color: '#fff',
                  '&:hover': { bgcolor: 'primary.dark' },
                }}
              >
                {uploading ? <CircularProgress size={16} color="inherit" /> : <UploadRoundedIcon fontSize="small" />}
              </IconButton>
            </Box>
            <Typography variant="h6" sx={{ mt: 2, fontWeight: 700 }}>
              {profile.firstName} {profile.lastName}
            </Typography>
          </Paper>
        </Grid>

        <Grid item xs={12} md={8}>
          <Paper variant="outlined" sx={{ p: 3, height: '100%' }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 2 }}>
              Actividad reciente
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2 }}>
              <Avatar sx={{ bgcolor: 'primary.light', color: 'primary.main', width: 56, height: 56 }}>
                <AssignmentTwoToneIcon />
              </Avatar>
              <Box>
                <Typography variant="h6" sx={{ fontWeight: 700 }}>
                  Órdenes de trabajo
                </Typography>
                <Box sx={{ display: 'flex', gap: 5, mt: 1 }}>
                  <Box>
                    <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                      CREADA
                    </Typography>
                    <Typography variant="h4" sx={{ fontWeight: 700 }}>
                      {overview?.created ?? 0}
                    </Typography>
                  </Box>
                  <Box>
                    <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                      COMPLETADA
                    </Typography>
                    <Typography variant="h4" sx={{ fontWeight: 700 }}>
                      {overview?.completed ?? 0}
                    </Typography>
                  </Box>
                </Box>
              </Box>
            </Box>
          </Paper>
        </Grid>
      </Grid>

      <Paper variant="outlined" sx={{ p: 3, mb: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
          <Box>
            <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
              Detalles personales
            </Typography>
            <Typography variant="body2" sx={{ color: 'text.secondary' }}>
              Gestionar información relacionada con sus datos personales
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button size="small" startIcon={<EditTwoToneIcon />} onClick={openEdit}>
              Editar
            </Button>
            <Button size="small" startIcon={<LockTwoToneIcon />} onClick={() => setPasswordOpen(true)}>
              Cambiar contraseña
            </Button>
          </Box>
        </Box>
        <Divider sx={{ mb: 2 }} />
        <Grid container spacing={2}>
          {[
            ['Nombre', profile.firstName],
            ['Apellido', profile.lastName],
            ['Correo electrónico', profile.email],
            ['Teléfono', profile.phone],
            ['Título profesional', profile.jobTitle],
          ].map(([label, value]) => (
            <Grid item xs={12} sm={6} key={label}>
              <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                {label}:
              </Typography>
              <Typography variant="body1" sx={{ fontWeight: 700 }}>
                {value || 'N/A'}
              </Typography>
            </Grid>
          ))}
        </Grid>
      </Paper>

      <Paper variant="outlined" sx={{ p: 3, mb: 3 }}>
        <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
          Configuración de notificaciones
        </Typography>
        <Typography variant="body2" sx={{ color: 'text.secondary', mb: 2 }}>
          Gestiona los detalles relacionados con sus notificaciones.
        </Typography>
        <Divider sx={{ mb: 2 }} />
        {settings && (
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Typography variant="body2">Notificaciones por correo electrónico:</Typography>
              <Switch checked={settings.emailNotified} onChange={() => handleToggleSetting('emailNotified')} />
            </Grid>
            <Grid item xs={12} sm={6} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Typography variant="body2">
                Actualizaciones por correo para órdenes de trabajo y mensaje:
              </Typography>
              <Switch
                checked={settings.emailUpdatesForWorkOrders}
                onChange={() => handleToggleSetting('emailUpdatesForWorkOrders')}
              />
            </Grid>
            <Grid item xs={12} sm={6} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Typography variant="body2">
                Actualizaciones por correo para órdenes de trabajo solicitadas:
              </Typography>
              <Switch
                checked={settings.emailUpdatesForRequests}
                onChange={() => handleToggleSetting('emailUpdatesForRequests')}
              />
            </Grid>
          </Grid>
        )}
      </Paper>

      <Button variant="contained" color="error" onClick={() => setDeleteOpen(true)}>
        Eliminar cuenta
      </Button>

      <Dialog open={editOpen} onClose={() => setEditOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Editar perfil</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 3 }}>
          <TextField label="Nombre" value={editFirstName} onChange={(e) => setEditFirstName(e.target.value)} fullWidth />
          <TextField label="Apellido" value={editLastName} onChange={(e) => setEditLastName(e.target.value)} fullWidth />
          <TextField label="Teléfono" value={editPhone} onChange={(e) => setEditPhone(e.target.value)} fullWidth />
          <TextField label="Título profesional" value={editJobTitle} onChange={(e) => setEditJobTitle(e.target.value)} fullWidth />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditOpen(false)} color="inherit">
            Cancelar
          </Button>
          <Button variant="contained" onClick={handleSaveEdit} disabled={savingEdit}>
            {savingEdit ? 'Guardando…' : 'Guardar'}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={passwordOpen} onClose={() => setPasswordOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Cambiar contraseña</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 3 }}>
          {passwordError && <Alert severity="error">{passwordError}</Alert>}
          <TextField
            label="Contraseña actual"
            type="password"
            value={oldPassword}
            onChange={(e) => setOldPassword(e.target.value)}
            fullWidth
          />
          <TextField
            label="Nueva contraseña"
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            fullWidth
          />
          <TextField
            label="Confirmar nueva contraseña"
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            fullWidth
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPasswordOpen(false)} color="inherit">
            Cancelar
          </Button>
          <Button variant="contained" onClick={handleChangePassword} disabled={savingPassword}>
            {savingPassword ? 'Guardando…' : 'Cambiar contraseña'}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={deleteOpen} onClose={() => setDeleteOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Eliminar cuenta</DialogTitle>
        <DialogContent>
          {deleteError && <Alert severity="error" sx={{ mb: 2 }}>{deleteError}</Alert>}
          <Typography variant="body2">
            Esta acción es permanente y no se puede deshacer. ¿Confirmas que quieres eliminar tu cuenta?
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteOpen(false)} color="inherit">
            Cancelar
          </Button>
          <Button variant="contained" color="error" onClick={handleDeleteAccount}>
            Eliminar mi cuenta
          </Button>
        </DialogActions>
      </Dialog>
      {profile && <MfaSettingsSection mfaEnabled={profile.mfaEnabled} onChanged={load} />}
    </>
  );
}
