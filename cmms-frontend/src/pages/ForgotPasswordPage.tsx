import { useState, type FormEvent } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import { Box, Paper, Typography, TextField, Button, Alert, Link } from '@mui/material';
import { authApi } from '../api/auth';
import { ApiRequestError } from '../api/client';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await authApi.forgotPassword(email.trim());
      setSent(true);
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : 'Algo salió mal, probá de nuevo.');
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
        <Typography variant="h6" sx={{ fontWeight: 700, mb: 1, textAlign: 'center' }}>
          Recuperar contraseña
        </Typography>

        {sent ? (
          <Alert severity="success" sx={{ mt: 2 }}>
            Si ese correo está registrado, te mandamos un link para elegir una contraseña nueva. Revisá tu bandeja
            de entrada (y spam, por las dudas).
          </Alert>
        ) : (
          <>
            <Typography variant="body2" sx={{ color: 'text.secondary', textAlign: 'center', mb: 3 }}>
              Te mandamos un link para elegir una contraseña nueva.
            </Typography>
            <Box component="form" onSubmit={handleSubmit} sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <TextField label="Correo" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoFocus fullWidth />
              {error && <Alert severity="error">{error}</Alert>}
              <Button type="submit" variant="contained" size="large" disabled={loading} fullWidth>
                {loading ? 'Enviando…' : 'Enviar link'}
              </Button>
            </Box>
          </>
        )}

        <Link component={RouterLink} to="/login" variant="body2" sx={{ display: 'block', textAlign: 'center', mt: 3 }}>
          Volver a iniciar sesión
        </Link>
      </Paper>
    </Box>
  );
}
