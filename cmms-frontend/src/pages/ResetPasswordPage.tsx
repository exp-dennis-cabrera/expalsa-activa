import { useState, type FormEvent } from 'react';
import { useNavigate, useSearchParams, Link as RouterLink } from 'react-router-dom';
import { Box, Paper, Typography, TextField, Button, Alert, Link } from '@mui/material';
import { authApi } from '../api/auth';
import { ApiRequestError } from '../api/client';

export default function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') ?? '';
  const navigate = useNavigate();

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      setError('Las contraseñas no coinciden.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await authApi.resetPassword(token, newPassword);
      setDone(true);
      setTimeout(() => navigate('/login'), 2500);
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : 'No se pudo cambiar la contraseña.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(160deg, #0f1b3d 0%, #23306b 55%, #3d4ea8 100%)',
        p: 3,
      }}
    >
      <Paper sx={{ p: 5, width: '100%', maxWidth: 400, borderRadius: 3 }}>
        <Typography variant="h6" sx={{ fontWeight: 700, mb: 3, textAlign: 'center' }}>
          Elige una contraseña nueva
        </Typography>

        {!token ? (
          <Alert severity="error">Este link no es válido. Pedí uno nuevo desde "Olvidé mi contraseña".</Alert>
        ) : done ? (
          <Alert severity="success">Contraseña actualizada. Redirigiendo al login…</Alert>
        ) : (
          <Box component="form" onSubmit={handleSubmit} sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <TextField
              label="Contraseña nueva"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              helperText="Mínimo 8 caracteres, con mayúscula, minúscula y número"
              required
              autoFocus
              fullWidth
            />
            <TextField
              label="Confirmar contraseña"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              fullWidth
            />
            {error && <Alert severity="error">{error}</Alert>}
            <Button type="submit" variant="contained" size="large" disabled={loading} fullWidth>
              {loading ? 'Guardando…' : 'Guardar contraseña'}
            </Button>
          </Box>
        )}

        <Link component={RouterLink} to="/login" variant="body2" sx={{ display: 'block', textAlign: 'center', mt: 3 }}>
          Volver a iniciar sesión
        </Link>
      </Paper>
    </Box>
  );
}
