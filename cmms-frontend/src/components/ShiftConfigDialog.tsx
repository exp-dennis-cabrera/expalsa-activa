import { useEffect, useState } from 'react';
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, TextField, Switch, Stack, Typography, Alert, MenuItem, Chip, Tabs, Tab, IconButton } from '@mui/material';
import ArrowBackIosNewIcon from '@mui/icons-material/ArrowBackIosNewRounded';
import ArrowForwardIosIcon from '@mui/icons-material/ArrowForwardIosRounded';
import { organizationSettingsApi } from '../api/organizationSettings';
import { workloadApi } from '../api/workload';
import type { ShiftDay, ShiftException } from '../types';
import { ApiRequestError } from '../api/client';

const DAY_ORDER = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY'];
const DAY_LABELS: Record<string, string> = {
  MONDAY: 'Lunes',
  TUESDAY: 'Martes',
  WEDNESDAY: 'Miércoles',
  THURSDAY: 'Jueves',
  FRIDAY: 'Viernes',
  SATURDAY: 'Sábado',
  SUNDAY: 'Domingo',
};

/** Lunes primero, igual que el orden de DAY_ORDER. */
function diaDeSemanaDeFecha(fecha: Date): string {
  return DAY_ORDER[fecha.getDay() === 0 ? 6 : fecha.getDay() - 1];
}

/** Los 7 dias de la semana que contiene esa fecha, empezando en lunes. */
function diasDeLaSemana(inicio: Date): Date[] {
  const lunes = new Date(inicio);
  lunes.setDate(lunes.getDate() - (lunes.getDay() === 0 ? 6 : lunes.getDay() - 1));
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(lunes);
    d.setDate(lunes.getDate() + i);
    return d;
  });
}

function claveFecha(f: Date): string {
  return `${f.getFullYear()}-${String(f.getMonth() + 1).padStart(2, '0')}-${String(f.getDate()).padStart(2, '0')}`;
}

function emptyDay(dayOfWeek: string): ShiftDay {
  return { dayOfWeek, enabled: false, startTime: '09:00:00', endTime: '17:00:00', durationMinutes: 0, crossesMidnight: false };
}

function toHHMM(time: string | null): string {
  return time ? time.slice(0, 5) : '';
}

interface Props {
  userId: number | null;
  userName: string;
  onClose: () => void;
}

export default function ShiftConfigDialog({ userId, userName, onClose }: Props) {
  const [days, setDays] = useState<ShiftDay[]>([]);
  // Igual que el modal real: dos pestañas -- el horario semanal por
  // defecto, y la capacidad personalizada semana por semana.
  const [tab, setTab] = useState<'default' | 'custom'>('default');
  const [exceptions, setExceptions] = useState<ShiftException[]>([]);
  const [weekStart, setWeekStart] = useState(new Date());
  // Las plantillas de turno vienen de Ajustes, no fijas en el codigo.
  const [presets, setPresets] = useState<{ label: string; start: string; end: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!userId) return;
    setLoading(true);
    workloadApi
      .getShift(userId)
      .then(setDays)
      .catch(() => setDays(DAY_ORDER.map(emptyDay)))
      .finally(() => setLoading(false));
    workloadApi.getShiftExceptions(userId).then(setExceptions).catch(() => setExceptions([]));
    organizationSettingsApi
      .get()
      .then((s) =>
        setPresets([
          { label: `Turno día (${toHHMM(s.dayShiftStart)}–${toHHMM(s.dayShiftEnd)})`, start: toHHMM(s.dayShiftStart), end: toHHMM(s.dayShiftEnd) },
          { label: `Turno noche (${toHHMM(s.nightShiftStart)}–${toHHMM(s.nightShiftEnd)})`, start: toHHMM(s.nightShiftStart), end: toHHMM(s.nightShiftEnd) },
        ]),
      )
      .catch(() => setPresets([]));
  }, [userId]);

  function updateDay(dayOfWeek: string, patch: Partial<ShiftDay>) {
    setDays((prev) => prev.map((d) => (d.dayOfWeek === dayOfWeek ? { ...d, ...patch } : d)));
  }

  /** Crea o actualiza la excepcion de esa fecha, en memoria. */
  function setException(fecha: string, patch: Partial<ShiftException>) {
    setExceptions((prev) => {
      const existente = prev.find((e) => e.exceptionDate === fecha);
      if (existente) {
        return prev.map((e) => (e.exceptionDate === fecha ? { ...e, ...patch } : e));
      }
      return [...prev, { exceptionDate: fecha, availabilityMinutes: 0, enabled: false, ...patch }];
    });
  }

  function applyPreset(dayOfWeek: string, presetIndex: string) {
    const preset = presets[Number(presetIndex)];
    if (!preset) return;
    updateDay(dayOfWeek, { startTime: `${preset.start}:00`, endTime: `${preset.end}:00`, enabled: true });
  }

  async function handleSave() {
    if (!userId) return;
    setSaving(true);
    setError(null);
    try {
      await workloadApi.updateShift(userId, days);
      // Las excepciones se guardan una por una: el backend hace crear o
      // actualizar segun la fecha, que es unica por usuario.
      for (const excepcion of exceptions) {
        await workloadApi.saveShiftException(userId, {
          exceptionDate: excepcion.exceptionDate,
          availabilityMinutes: excepcion.availabilityMinutes,
          enabled: excepcion.enabled,
          reason: excepcion.reason ?? null,
        });
      }
      onClose();
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : 'No se pudo guardar el turno');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={!!userId} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Configurar turno — {userName}</DialogTitle>
      <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ px: 3 }} textColor="primary" indicatorColor="primary">
        <Tab label="Horario por defecto" value="default" />
        <Tab label="Capacidad por semana" value="custom" />
      </Tabs>
      <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, pt: 1 }}>
        {tab === 'default' && (
        <Typography variant="body2" sx={{ color: 'text.secondary', mb: 1 }}>
          Define la hora de inicio y fin de cada día. Si la hora de fin es menor a la de inicio (ej. 18:00 → 07:00),
          se interpreta como turno nocturno que cruza a la madrugada del día siguiente.
        </Typography>
        )}

        {error && <Alert severity="error">{error}</Alert>}

        {tab === 'default' && !loading &&
          DAY_ORDER.map((dayKey) => {
            const day = days.find((d) => d.dayOfWeek === dayKey) ?? emptyDay(dayKey);
            return (
              <Stack key={dayKey} direction="row" alignItems="center" spacing={1.5}>
                <Switch checked={day.enabled} onChange={(e) => updateDay(dayKey, { enabled: e.target.checked })} />
                <Typography variant="body2" sx={{ width: 85, flexShrink: 0 }}>
                  {DAY_LABELS[dayKey]}
                </Typography>
                <TextField
                  size="small"
                  type="time"
                  label="Inicio"
                  disabled={!day.enabled}
                  value={toHHMM(day.startTime)}
                  onChange={(e) => updateDay(dayKey, { startTime: `${e.target.value}:00` })}
                  sx={{ width: 110 }}
                />
                <TextField
                  size="small"
                  type="time"
                  label="Fin"
                  disabled={!day.enabled}
                  value={toHHMM(day.endTime)}
                  onChange={(e) => updateDay(dayKey, { endTime: `${e.target.value}:00` })}
                  sx={{ width: 110 }}
                />
                {day.enabled && (
                  <Chip
                    label={
                      toHHMM(day.startTime) === toHHMM(day.endTime)
                        ? 'Turno 24h'
                        : day.crossesMidnight
                          ? 'Nocturno'
                          : 'Día'
                    }
                    size="small"
                    color={day.crossesMidnight ? 'secondary' : 'default'}
                    variant={day.crossesMidnight ? 'filled' : 'outlined'}
                  />
                )}
                <TextField
                  select
                  size="small"
                  label="Preset"
                  disabled={!day.enabled}
                  value=""
                  onChange={(e) => applyPreset(dayKey, e.target.value)}
                  sx={{ width: 90 }}
                >
                  {presets.map((p, i) => (
                    <MenuItem key={p.label} value={i}>
                      {p.label}
                    </MenuItem>
                  ))}
                </TextField>
              </Stack>
            );
          })}

        {/* Igual que la pestaña "custom_capacity_by_week" real: se navega
            semana a semana y cada dia muestra lo que hereda del horario
            por defecto, o la excepcion si existe para esa fecha. */}
        {tab === 'custom' && (
          <>
            <Stack direction="row" alignItems="center" justifyContent="center" spacing={2} sx={{ mb: 1 }}>
              <IconButton onClick={() => setWeekStart((p) => { const d = new Date(p); d.setDate(d.getDate() - 7); return d; })}>
                <ArrowBackIosNewIcon fontSize="small" />
              </IconButton>
              <Typography variant="subtitle1" sx={{ minWidth: 200, textAlign: 'center' }}>
                {diasDeLaSemana(weekStart)[0].toLocaleDateString()} – {diasDeLaSemana(weekStart)[6].toLocaleDateString()}
              </Typography>
              <IconButton onClick={() => setWeekStart((p) => { const d = new Date(p); d.setDate(d.getDate() + 7); return d; })}>
                <ArrowForwardIosIcon fontSize="small" />
              </IconButton>
            </Stack>

            {diasDeLaSemana(weekStart).map((fecha) => {
              const clave = claveFecha(fecha);
              const diaBase = days.find((d) => d.dayOfWeek === diaDeSemanaDeFecha(fecha)) ?? emptyDay(diaDeSemanaDeFecha(fecha));
              const excepcion = exceptions.find((e) => e.exceptionDate === clave);
              const habilitado = excepcion ? excepcion.enabled : diaBase.enabled;
              const minutos = excepcion?.availabilityMinutes ?? diaBase.durationMinutes ?? 0;
              return (
                <Stack key={clave} direction="row" alignItems="center" spacing={1.5}>
                  <Switch
                    checked={habilitado}
                    onChange={(e) => setException(clave, { enabled: e.target.checked, availabilityMinutes: minutos })}
                  />
                  <Typography sx={{ minWidth: 90, fontWeight: 500 }}>{DAY_LABELS[diaDeSemanaDeFecha(fecha)]}</Typography>
                  <Typography sx={{ minWidth: 90, color: 'text.secondary', fontSize: 13 }}>
                    {fecha.toLocaleDateString()}
                  </Typography>
                  <TextField
                    type="number"
                    size="small"
                    label="Horas"
                    value={Math.floor(minutos / 60)}
                    disabled={!habilitado}
                    onChange={(e) =>
                      setException(clave, {
                        enabled: true,
                        availabilityMinutes: Math.max(0, Number(e.target.value)) * 60 + (minutos % 60),
                      })
                    }
                    inputProps={{ min: 0, max: 24 }}
                    sx={{ width: 90 }}
                  />
                  <TextField
                    type="number"
                    size="small"
                    label="Minutos"
                    value={minutos % 60}
                    disabled={!habilitado}
                    onChange={(e) =>
                      setException(clave, {
                        enabled: true,
                        availabilityMinutes: Math.floor(minutos / 60) * 60 + Math.max(0, Math.min(59, Number(e.target.value))),
                      })
                    }
                    inputProps={{ min: 0, max: 59 }}
                    sx={{ width: 90 }}
                  />
                  {excepcion && (
                    <Chip label="Personalizado" size="small" color="primary" variant="outlined" />
                  )}
                </Stack>
              );
            })}
          </>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} color="inherit">
          Cancelar
        </Button>
        <Button variant="contained" onClick={handleSave} disabled={saving || loading}>
          {saving ? 'Guardando…' : 'Guardar'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
