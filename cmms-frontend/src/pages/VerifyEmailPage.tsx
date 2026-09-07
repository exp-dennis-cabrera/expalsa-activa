import { useEffect, useState } from 'react';
import { Link as RouterLink, useSearchParams } from 'react-router-dom';
import { Box, Paper, Typography, Alert, Link, CircularProgress } from '@mui/material';
import { authApi } from '../api/auth';
import { ApiRequestError } from '../api/client';

export default function VerifyEmailPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') ?? '';
  const [status, setStatus] = useState<'loading' | 'ok' | 'error'>('loading');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) {
      setStatus('error');
      setError('Este link no es válido.');
      return;
    }
    authApi
      .verifyEmail(token)
      .then(() => setStatus('ok'))
      .catch((err) => {
        setStatus('error');
        setError(err instanceof ApiRequestError ? err.message : 'No se pudo confirmar el correo.');
      });
  }, [token]);

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
      <Paper sx={{ p: 5, width: '100%', maxWidth: 400, borderRadius: 3, textAlign: 'center' }}>
        <Typography variant="h6" sx={{ fontWeight: 700, mb: 3 }}>
          Confirmar correo
        </Typography>

        {status === 'loading' && <CircularProgress />}
        {status === 'ok' && <Alert severity="success">Tu correo quedó confirmado.</Alert>}
        {status === 'error' && <Alert severity="error">{error}</Alert>}

        <Link component={RouterLink} to="/login" variant="body2" sx={{ display: 'block', mt: 3 }}>
          Ir al login
        </Link>
      </Paper>
    </Box>
  );
}
