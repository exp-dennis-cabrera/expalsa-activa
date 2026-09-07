import { useState, type FormEvent } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Box,
  Paper,
  Typography,
  TextField,
  Button,
  Alert,
  IconButton,
  InputAdornment,
  FormControlLabel,
  Checkbox,
  Link,
} from '@mui/material';
import VisibilityIcon from '@mui/icons-material/VisibilityRounded';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOffRounded';
import { useAuth } from '../context/AuthContext';
import { ApiRequestError } from '../api/client';

export default function AcceptInvitePage() {
  const { acceptInvitation } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [email] = useState(searchParams.get('email') ?? '');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!acceptedTerms) {
      setError('Debes aceptar los términos y condiciones');
      return;
    }
    setError(null);
    setLoading(true);
    try {
      await acceptInvitation({ email, password, firstName, lastName: lastName || undefined, phone: phone || undefined });
      navigate('/app/work-orders');
    } catch (err) {
      const message = err instanceof ApiRequestError ? err.message : 'No se pudo crear la cuenta';
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  if (!email) {
    return (
      <Box sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Alert severity="error">Este link de invitación no es válido — falta el email.</Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ minHeight: '100vh', display: 'flex' }}>
      {/* Panel izquierdo: mismo espíritu que el carrusel de marketing de Atlas */}
      <Box
        sx={{
          flex: 1,
          display: { xs: 'none', md: 'flex' },
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          textAlign: 'center',
          px: 6,
          background: 'linear-gradient(160deg, #0f1b3d 0%, #23306b 55%, #3d4ea8 100%)',
          color: '#fff',
        }}
      >
        <Typography variant="h4" sx={{ fontWeight: 700, mb: 4, maxWidth: 360 }}>
          La herramienta perfecta para equipos de mantenimiento
        </Typography>
        <Box
          sx={{
            bgcolor: '#fff',
            borderRadius: 2,
            px: 3,
            py: 2,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            mb: 4,
          }}
        >
          <Box
            component="img"
            src="/branding/logo.png"
            alt="Expalsa"
            sx={{ height: 60, width: 'auto', maxWidth: '100%', objectFit: 'contain' }}
          />
        </Box>
        <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>
          Gestión de activos empresariales
        </Typography>
        <Typography variant="body2" sx={{ opacity: 0.85 }}>
          Órdenes de trabajo, activos y equipos en un solo lugar
        </Typography>
      </Box>

      {/* Panel derecho: formulario */}
      <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', p: 3 }}>
        <Paper sx={{ p: 5, width: '100%', maxWidth: 420, borderRadius: 3 }} elevation={0}>
          <Typography variant="h5" sx={{ fontWeight: 700, textAlign: 'center' }}>
            Crear cuenta
          </Typography>
          <Typography variant="body2" sx={{ color: 'text.secondary', textAlign: 'center', mb: 3 }}>
            Complete los campos a continuación para registrarse y obtener una cuenta.
          </Typography>

          <Box component="form" onSubmit={handleSubmit} sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Box sx={{ display: 'flex', gap: 2 }}>
              <TextField
                label="Nombre"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                required
                autoFocus
                fullWidth
              />
              <TextField label="Apellido" value={lastName} onChange={(e) => setLastName(e.target.value)} fullWidth />
            </Box>

            <TextField label="Correo electrónico" value={email} disabled fullWidth />

            <TextField label="Teléfono" value={phone} onChange={(e) => setPhone(e.target.value)} fullWidth />

            <TextField
              label="Contraseña"
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              fullWidth
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton onClick={() => setShowPassword((v) => !v)} edge="end" size="small">
                      {showPassword ? <VisibilityOffIcon fontSize="small" /> : <VisibilityIcon fontSize="small" />}
                    </IconButton>
                  </InputAdornment>
                ),
              }}
            />

            {error && <Alert severity="error">{error}</Alert>}

            <Button type="submit" variant="contained" size="large" disabled={loading} fullWidth>
              {loading ? 'Creando cuenta…' : 'Crear cuenta'}
            </Button>

            <FormControlLabel
              control={<Checkbox checked={acceptedTerms} onChange={(e) => setAcceptedTerms(e.target.checked)} />}
              label={
                <Typography variant="body2">
                  Acepto los <Link href="#" onClick={(e) => e.preventDefault()}>términos y condiciones</Link>.
                </Typography>
              }
            />

            <Typography variant="body2" sx={{ textAlign: 'center' }}>
              ¿Ya tiene una cuenta?{' '}
              <Link component="button" type="button" onClick={() => navigate('/login')}>
                Inicie sesión aquí
              </Link>
            </Typography>
          </Box>
        </Paper>
      </Box>
    </Box>
  );
}
