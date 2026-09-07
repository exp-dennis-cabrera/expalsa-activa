import { useState } from 'react';
import { Box, Typography, Button, TextField, Alert, Paper, Stack } from '@mui/material';
import { mfaApi } from '../api/auth';
import { ApiRequestError } from '../api/client';

interface Props {
  mfaEnabled: boolean;
  onChanged: () => void;
}

export default function MfaSettingsSection({ mfaEnabled, onChanged }: Props) {
  const [setupData, setSetupData] = useState<{ secret: string; otpAuthUri: string } | null>(null);
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function handleStartSetup() {
    setError(null);
    setBusy(true);
    try {
      setSetupData(await mfaApi.setup());
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : 'No se pudo iniciar la configuración.');
    } finally {
      setBusy(false);
    }
  }

  async function handleConfirmEnable() {
    setError(null);
    setBusy(true);
    try {
      await mfaApi.enable(code.trim());
      setSetupData(null);
      setCode('');
      onChanged();
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : 'El código no es correcto.');
    } finally {
      setBusy(false);
    }
  }

  async function handleDisable() {
    if (!window.confirm('¿Desactivar la verificación en dos pasos?')) return;
    setBusy(true);
    try {
      await mfaApi.disable();
      onChanged();
    } finally {
      setBusy(false);
    }
  }

  return (
    <Paper variant="outlined" sx={{ p: 3, mt: 3 }}>
      <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>
        Verificación en dos pasos (MFA)
      </Typography>
      <Typography variant="body2" sx={{ color: 'text.secondary', mb: 2 }}>
        Además de tu contraseña, pide un código de una app de autenticación (Google Authenticator, Authy, etc.) al
        iniciar sesión.
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {mfaEnabled ? (
        <Stack direction="row" spacing={2} alignItems="center">
          <Alert severity="success" sx={{ flex: 1 }}>
            Activada
          </Alert>
          <Button variant="outlined" color="error" onClick={handleDisable} disabled={busy}>
            Desactivar
          </Button>
        </Stack>
      ) : setupData ? (
        <Box>
          <Typography variant="body2" sx={{ mb: 1 }}>
            Carga este código en tu app de autenticación (o cópialo a mano si no puedes escanear un QR):
          </Typography>
          <Box
            sx={{
              p: 1.5,
              bgcolor: '#F2F4F9',
              borderRadius: 1,
              fontFamily: 'monospace',
              fontSize: 14,
              wordBreak: 'break-all',
              mb: 2,
            }}
          >
            {setupData.secret}
          </Box>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <TextField
              size="small"
              label="Código de 6 dígitos"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              inputProps={{ inputMode: 'numeric', maxLength: 6 }}
            />
            <Button variant="contained" onClick={handleConfirmEnable} disabled={busy || code.length !== 6}>
              Confirmar y activar
            </Button>
            <Button color="inherit" onClick={() => setSetupData(null)}>
              Cancelar
            </Button>
          </Box>
        </Box>
      ) : (
        <Button variant="contained" onClick={handleStartSetup} disabled={busy}>
          Activar verificación en dos pasos
        </Button>
      )}
    </Paper>
  );
}
