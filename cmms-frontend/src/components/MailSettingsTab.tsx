import { useEffect, useState } from 'react';
import {
  Box,
  Typography,
  Paper,
  TextField,
  MenuItem,
  Switch,
  FormControlLabel,
  Button,
  Alert,
  Divider,
  Stack,
} from '@mui/material';
import { mailSettingsApi } from '../api/mailSettings';
import { ApiRequestError } from '../api/client';

export default function MailSettingsTab() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [enabled, setEnabled] = useState(false);
  const [mailType, setMailType] = useState<'SMTP' | 'SENDGRID'>('SMTP');
  const [fromEmail, setFromEmail] = useState('');
  const [fromName, setFromName] = useState('');
  const [sendgridApiKey, setSendgridApiKey] = useState('');
  const [sendgridApiKeySet, setSendgridApiKeySet] = useState(false);
  const [smtpHost, setSmtpHost] = useState('');
  const [smtpPort, setSmtpPort] = useState('587');
  const [smtpUsername, setSmtpUsername] = useState('');
  const [smtpPassword, setSmtpPassword] = useState('');
  const [smtpPasswordSet, setSmtpPasswordSet] = useState(false);
  const [smtpTrustAllCertificates, setSmtpTrustAllCertificates] = useState(false);

  const [testEmail, setTestEmail] = useState('');
  const [testing, setTesting] = useState(false);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const s = await mailSettingsApi.get();
      setEnabled(s.enabled);
      setMailType(s.mailType);
      setFromEmail(s.fromEmail ?? '');
      setFromName(s.fromName ?? '');
      setSendgridApiKeySet(s.sendgridApiKeySet);
      setSmtpHost(s.smtpHost ?? '');
      setSmtpPort(s.smtpPort ? String(s.smtpPort) : '587');
      setSmtpUsername(s.smtpUsername ?? '');
      setSmtpPasswordSet(s.smtpPasswordSet);
      setSmtpTrustAllCertificates(s.smtpTrustAllCertificates);
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : 'No se pudo cargar la configuración');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function handleSave() {
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      await mailSettingsApi.update({
        enabled,
        mailType,
        fromEmail: fromEmail || undefined,
        fromName: fromName || undefined,
        sendgridApiKey: sendgridApiKey || undefined,
        smtpHost: smtpHost || undefined,
        smtpPort: smtpPort ? Number(smtpPort) : undefined,
        smtpUsername: smtpUsername || undefined,
        smtpPassword: smtpPassword || undefined,
        smtpTrustAllCertificates,
      });
      setSendgridApiKey('');
      setSmtpPassword('');
      setSuccess('Configuración guardada.');
      load();
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : 'No se pudo guardar');
    } finally {
      setSaving(false);
    }
  }

  async function handleSendTest() {
    if (!testEmail) return;
    setTesting(true);
    setError(null);
    setSuccess(null);
    try {
      await mailSettingsApi.sendTest(testEmail);
      setSuccess(`Correo de prueba enviado a ${testEmail}.`);
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : 'No se pudo enviar el correo de prueba');
    } finally {
      setTesting(false);
    }
  }

  if (loading) {
    return <Typography sx={{ color: 'text.secondary' }}>Cargando…</Typography>;
  }

  return (
    <Paper variant="outlined" sx={{ p: 3, maxWidth: 520 }}>
      <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 0.5 }}>
        Configuración de correo
      </Typography>
      <Typography variant="body2" sx={{ color: 'text.secondary', mb: 3 }}>
        Se usa para enviar las invitaciones a nuevas personas. Sin esto, las invitaciones
        solo generan un link que debes compartir manualmente.
      </Typography>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      {success && <Alert severity="success" sx={{ mb: 2 }}>{success}</Alert>}

      <Stack spacing={2}>
        <FormControlLabel
          control={<Switch checked={enabled} onChange={(e) => setEnabled(e.target.checked)} />}
          label="Envío de correo habilitado"
        />

        <TextField select label="Proveedor" value={mailType} onChange={(e) => setMailType(e.target.value as 'SMTP' | 'SENDGRID')} fullWidth>
          <MenuItem value="SMTP">SMTP genérico</MenuItem>
          <MenuItem value="SENDGRID">SendGrid</MenuItem>
        </TextField>

        <Box sx={{ display: 'flex', gap: 2 }}>
          <TextField label="Email remitente" value={fromEmail} onChange={(e) => setFromEmail(e.target.value)} fullWidth />
          <TextField label="Nombre remitente" value={fromName} onChange={(e) => setFromName(e.target.value)} fullWidth />
        </Box>

        {mailType === 'SENDGRID' ? (
          <TextField
            label="SendGrid API Key"
            type="password"
            value={sendgridApiKey}
            onChange={(e) => setSendgridApiKey(e.target.value)}
            placeholder={sendgridApiKeySet ? '•••••••••••• (ya configurada, deja vacío para no cambiarla)' : 'SG.xxxxxxxxxxxxx'}
            fullWidth
          />
        ) : (
          <>
            <Box sx={{ display: 'flex', gap: 2 }}>
              <TextField label="Host SMTP" value={smtpHost} onChange={(e) => setSmtpHost(e.target.value)} fullWidth />
              <TextField label="Puerto" type="number" value={smtpPort} onChange={(e) => setSmtpPort(e.target.value)} sx={{ width: 140 }} />
            </Box>
            <TextField label="Usuario SMTP" value={smtpUsername} onChange={(e) => setSmtpUsername(e.target.value)} fullWidth />
            <TextField
              label="Contraseña SMTP"
              type="password"
              value={smtpPassword}
              onChange={(e) => setSmtpPassword(e.target.value)}
              placeholder={smtpPasswordSet ? '•••••••••••• (ya configurada, deja vacío para no cambiarla)' : ''}
              fullWidth
            />
            <FormControlLabel
              control={
                <Switch
                  checked={smtpTrustAllCertificates}
                  onChange={(e) => setSmtpTrustAllCertificates(e.target.checked)}
                />
              }
              label="Confiar en el certificado de este servidor (autofirmado)"
            />
            {smtpTrustAllCertificates && (
              <Alert severity="warning" sx={{ fontSize: 13 }}>
                Úsalo solo con servidores SMTP dentro de tu propia red corporativa.
                Desactiva la validación de certificado — no lo actives para servidores
                públicos desconocidos.
              </Alert>
            )}
          </>
        )}

        <Button variant="contained" onClick={handleSave} disabled={saving} sx={{ alignSelf: 'flex-start' }}>
          {saving ? 'Guardando…' : 'Guardar configuración'}
        </Button>

        <Divider sx={{ my: 1 }} />

        <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
          Probar envío
        </Typography>
        <Box sx={{ display: 'flex', gap: 1.5 }}>
          <TextField
            size="small"
            label="Enviar correo de prueba a"
            value={testEmail}
            onChange={(e) => setTestEmail(e.target.value)}
            fullWidth
          />
          <Button variant="outlined" onClick={handleSendTest} disabled={testing || !testEmail}>
            {testing ? 'Enviando…' : 'Enviar prueba'}
          </Button>
        </Box>
      </Stack>
    </Paper>
  );
}
