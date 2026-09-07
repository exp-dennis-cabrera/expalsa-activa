import { useEffect, useState } from 'react';
import { Box, Typography, TextField, Button, Alert, Paper, Stack, MenuItem } from '@mui/material';
import { organizationSettingsApi, type OrganizationSettings } from '../api/organizationSettings';
import { ApiRequestError } from '../api/client';

/** "07:00:00" -> "07:00", para el campo de hora del navegador. */
function aHoraCorta(valor: string | undefined): string {
  return valor ? valor.slice(0, 5) : '';
}

export default function ShiftsSettingsTab() {
  const [settings, setSettings] = useState<OrganizationSettings | null>(null);
  const [dayStart, setDayStart] = useState('');
  const [dayEnd, setDayEnd] = useState('');
  const [nightStart, setNightStart] = useState('');
  const [nightEnd, setNightEnd] = useState('');
  const [deadlineHour, setDeadlineHour] = useState('7');
  const [saving, setSaving] = useState(false);
  const [mensaje, setMensaje] = useState<{ texto: string; error: boolean } | null>(null);

  useEffect(() => {
    organizationSettingsApi
      .get()
      .then((s) => {
        setSettings(s);
        setDayStart(aHoraCorta(s.dayShiftStart));
        setDayEnd(aHoraCorta(s.dayShiftEnd));
        setNightStart(aHoraCorta(s.nightShiftStart));
        setNightEnd(aHoraCorta(s.nightShiftEnd));
        setDeadlineHour(String(s.readingDeadlineHour ?? 7));
      })
      .catch(() => setMensaje({ texto: 'No se pudieron cargar los ajustes.', error: true }));
  }, []);

  async function handleSave() {
    setSaving(true);
    setMensaje(null);
    try {
      await organizationSettingsApi.update({
        dayShiftStart: dayStart,
        dayShiftEnd: dayEnd,
        nightShiftStart: nightStart,
        nightShiftEnd: nightEnd,
        readingDeadlineHour: Number(deadlineHour),
      });
      setMensaje({ texto: 'Cambios guardados.', error: false });
    } catch (err) {
      setMensaje({
        texto: err instanceof ApiRequestError ? err.message : 'No se pudieron guardar los cambios.',
        error: true,
      });
    } finally {
      setSaving(false);
    }
  }

  if (!settings) {
    return (
      <Box sx={{ py: 4 }}>
        <Typography sx={{ color: 'text.secondary' }}>Cargando…</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ maxWidth: 640 }}>
      {mensaje && (
        <Alert severity={mensaje.error ? 'error' : 'success'} sx={{ mb: 2 }} onClose={() => setMensaje(null)}>
          {mensaje.texto}
        </Alert>
      )}

      <Paper variant="outlined" sx={{ p: 3, mb: 2 }}>
        <Typography variant="h6" sx={{ mb: 0.5 }}>
          Horarios de turno
        </Typography>
        <Typography variant="body2" sx={{ color: 'text.secondary', mb: 2.5 }}>
          Se usan como plantilla al configurar el turno de cada persona. Cambiarlos aquí no modifica los
          turnos ya asignados.
        </Typography>

        <Typography variant="subtitle2" sx={{ mb: 1 }}>
          Turno diurno
        </Typography>
        <Stack direction="row" spacing={2} sx={{ mb: 3 }}>
          <TextField
            label="Desde"
            type="time"
            value={dayStart}
            onChange={(e) => setDayStart(e.target.value)}
            InputLabelProps={{ shrink: true }}
            sx={{ width: 160 }}
          />
          <TextField
            label="Hasta"
            type="time"
            value={dayEnd}
            onChange={(e) => setDayEnd(e.target.value)}
            InputLabelProps={{ shrink: true }}
            sx={{ width: 160 }}
          />
        </Stack>

        <Typography variant="subtitle2" sx={{ mb: 1 }}>
          Turno nocturno
        </Typography>
        <Stack direction="row" spacing={2} sx={{ mb: 1 }}>
          <TextField
            label="Desde"
            type="time"
            value={nightStart}
            onChange={(e) => setNightStart(e.target.value)}
            InputLabelProps={{ shrink: true }}
            sx={{ width: 160 }}
          />
          <TextField
            label="Hasta"
            type="time"
            value={nightEnd}
            onChange={(e) => setNightEnd(e.target.value)}
            InputLabelProps={{ shrink: true }}
            sx={{ width: 160 }}
          />
        </Stack>
        <Typography variant="caption" sx={{ color: 'text.secondary' }}>
          El turno nocturno puede cruzar la medianoche (por ejemplo, 19:00 a 07:00).
        </Typography>
      </Paper>

      <Paper variant="outlined" sx={{ p: 3, mb: 2 }}>
        <Typography variant="h6" sx={{ mb: 0.5 }}>
          Lecturas de medidores
        </Typography>
        <Typography variant="body2" sx={{ color: 'text.secondary', mb: 2.5 }}>
          Hasta qué hora se pueden registrar las lecturas del día. Después de esta hora, un medidor sin
          registrar pasa de "Pendiente" a "No registrado".
        </Typography>
        <TextField
          select
          label="Hora límite"
          value={deadlineHour}
          onChange={(e) => setDeadlineHour(e.target.value)}
          sx={{ width: 160 }}
        >
          {Array.from({ length: 24 }, (_, h) => (
            <MenuItem key={h} value={String(h)}>
              {String(h).padStart(2, '0')}:00
            </MenuItem>
          ))}
        </TextField>
      </Paper>

      <Button variant="contained" onClick={handleSave} disabled={saving}>
        {saving ? 'Guardando…' : 'Guardar cambios'}
      </Button>
    </Box>
  );
}
