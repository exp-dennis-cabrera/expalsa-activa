import { useEffect, useState } from 'react';
import {
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Drawer,
  Box,
  Typography,
  IconButton,
  Tabs,
  Tab,
  Grid,
  TextField,
  Button,
  List,
  ListItem,
  ListItemText,
  Stack,
  Alert,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBackRounded';
import EditTwoToneIcon from '@mui/icons-material/EditTwoTone';
import VisibilityOffTwoToneIcon from '@mui/icons-material/VisibilityOffTwoTone';
import VisibilityTwoToneIcon from '@mui/icons-material/VisibilityTwoTone';
import SwapHorizTwoToneIcon from '@mui/icons-material/SwapHorizTwoTone';
import { Tooltip as MuiTooltip } from '@mui/material';
import { useAuth } from '../context/AuthContext';
import DeleteTwoToneIcon from '@mui/icons-material/DeleteTwoTone';
import AddTwoToneIcon from '@mui/icons-material/AddTwoTone';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { assetsApi, type MeterDeviceEntry } from '../api/assets';
import { usersApi, type UserMini } from '../api/users';
import type { MeterEntry, MeterTriggerEntry, MeterReadingEntry } from '../types';
import { ApiRequestError } from '../api/client';
import ConfirmDialog from './ConfirmDialog';
import CreateMeterDialog from './CreateMeterDialog';
import AddTriggerDialog from './AddTriggerDialog';

interface Props {
  meter: MeterEntry | null;
  onClose: () => void;
  onChanged: () => void;
}

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <Grid item xs={6}>
      <Typography variant="caption" sx={{ color: 'text.secondary' }}>
        {label}
      </Typography>
      <Typography variant="body2" sx={{ fontWeight: 500 }}>
        {value ?? '—'}
      </Typography>
    </Grid>
  );
}

export default function MeterDetailDialog({ meter, onClose, onChanged }: Props) {
  const { hasDeletePermission } = useAuth();
  /**
   * Registro para evaluar el permiso. hasDeletePermission devuelve false si
   * recibe null, asi que hay que pasarle los datos reales del medidor: el
   * creador y los asignados.
   */
  const registroPermiso = meter
    ? { createdById: meter.createdById, assignedUserIds: meter.assignedUserIds }
    : null;
  const [devices, setDevices] = useState<MeterDeviceEntry[]>([]);
  const [replaceOpen, setReplaceOpen] = useState(false);
  const [newSerial, setNewSerial] = useState('');
  const [replaceNotes, setReplaceNotes] = useState('');
  const [replacing, setReplacing] = useState(false);
  const [tab, setTab] = useState<'details' | 'history' | 'devices'>('details');
  const [, setUsers] = useState<UserMini[]>([]);
  const [triggers, setTriggers] = useState<MeterTriggerEntry[]>([]);
  const [newReadingValue, setNewReadingValue] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [confirmState, setConfirmState] = useState<{ question: string; confirmText: string; onConfirm: () => void } | null>(null);
  const [editingReading, setEditingReading] = useState<MeterReadingEntry | null>(null);
  const [editValue, setEditValue] = useState('');
  const [savingReading, setSavingReading] = useState(false);
  const [addingReading, setAddingReading] = useState(false);
  const [editOpen, setEditOpen] = useState(false);

  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [triggerDialogOpen, setTriggerDialogOpen] = useState(false);
  const [editingTrigger, setEditingTrigger] = useState<MeterTriggerEntry | null>(null);

  useEffect(() => {
    if (!meter) return;
    setTab('details');
    usersApi.mini().then(setUsers).catch(() => setUsers([]));
    assetsApi.getMeterTriggers(meter.id).then(setTriggers).catch(() => setTriggers([]));
    assetsApi.getMeterDevices(meter.id).then(setDevices).catch(() => setDevices([]));
    const today = new Date();
    const weekAgo = new Date(today.getTime() - 7 * 24 * 3600 * 1000);
    setDateFrom(weekAgo.toISOString().slice(0, 10));
    setDateTo(today.toISOString().slice(0, 10));
  }, [meter]);

  async function reloadTriggers() {
    if (!meter) return;
    setTriggers(await assetsApi.getMeterTriggers(meter.id));
  }

  async function handleAddReading() {
    if (!meter) return;
    const valor = Number(newReadingValue);
    if (!newReadingValue.trim() || Number.isNaN(valor) || valor < 0) {
      setError('Escribe un valor numérico válido para la lectura.');
      return;
    }
    setAddingReading(true);
    try {
      await assetsApi.addMeterReading(meter.id, valor);
      setNewReadingValue('');
      onChanged();
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : 'No se pudo registrar la lectura');
    } finally {
      setAddingReading(false);
    }
  }

  async function handleSaveEditedReading() {
    if (!editingReading) return;
    setSavingReading(true);
    try {
      await assetsApi.updateReading(editingReading.id, Number(editValue));
      setEditingReading(null);
      onChanged();
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : 'No se pudo editar la lectura');
    } finally {
      setSavingReading(false);
    }
  }

  function handleDeleteReading(readingId: number) {
    setConfirmState({
      question: '¿Eliminar esta lectura?',
      confirmText: 'Borrar',
      onConfirm: () => doDeleteReading(readingId),
    });
  }

  async function doDeleteReading(readingId: number) {
    try {
      await assetsApi.deleteReading(readingId);
      onChanged();
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : 'No se pudo eliminar la lectura');
    }
  }

  /**
   * Deshabilitar oculta el medidor del listado SIN borrarlo: las lecturas
   * historicas se conservan y se puede volver a habilitar. Es la opcion
   * segura frente a eliminar, que borra todo en cascada.
   */
  async function handleReplaceDevice() {
    if (!meter) return;
    setReplacing(true);
    try {
      await assetsApi.replaceMeterDevice(meter.id, newSerial.trim() || undefined, replaceNotes.trim() || undefined);
      setReplaceOpen(false);
      setNewSerial('');
      setReplaceNotes('');
      // Se recarga el historial para que la pestaña y el aviso reflejen el
      // reemplazo sin cerrar y volver a abrir el medidor.
      assetsApi.getMeterDevices(meter.id).then(setDevices).catch(() => {});
      onChanged();
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : 'No se pudo registrar el reemplazo');
    } finally {
      setReplacing(false);
    }
  }

  async function handleToggleDisabled() {
    if (!meter) return;
    try {
      await assetsApi.setMeterDisabled(meter.id, !meter.disabled);
      onChanged();
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : 'No se pudo cambiar el estado del medidor');
    }
  }

  function handleDeleteMeter() {
    if (!meter) return;
    setConfirmState({
      question: `¿Eliminar el medidor "${meter.name}"? Esto no se puede deshacer.`,
      confirmText: 'Borrar',
      onConfirm: () => doDeleteMeter(),
    });
  }

  async function doDeleteMeter() {
    if (!meter) return;
    try {
      await assetsApi.deleteMeter(meter.id);
      onChanged();
      onClose();
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : 'No se pudo eliminar el medidor');
    }
  }

  function openNewTriggerForm() {
    setEditingTrigger(null);
    setTriggerDialogOpen(true);
  }

  function openEditTriggerForm(t: MeterTriggerEntry) {
    setEditingTrigger(t);
    setTriggerDialogOpen(true);
  }

  function handleDeleteTrigger(triggerId: number) {
    setConfirmState({
      question: '¿Eliminar este disparador?',
      confirmText: 'Borrar',
      onConfirm: () => doDeleteTrigger(triggerId),
    });
  }

  async function doDeleteTrigger(triggerId: number) {
    try {
      await assetsApi.deleteMeterTrigger(triggerId);
      reloadTriggers();
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : 'No se pudo eliminar el disparador');
    }
  }

  const chartData = meter
    ? [...meter.readings]
        .filter((r) => {
          const d = new Date(r.readingDate);
          if (dateFrom && d < new Date(dateFrom)) return false;
          if (dateTo && d > new Date(dateTo + 'T23:59:59')) return false;
          return true;
        })
        .sort((a, b) => new Date(a.readingDate).getTime() - new Date(b.readingDate).getTime())
        .map((r) => ({
          date: new Date(r.readingDate).toLocaleDateString(),
          // Se grafica el acumulado, no la lectura fisica: tras un
          // reemplazo el contador vuelve a cero, y sin sumar el arrastre
          // la curva caeria a cero en vez de seguir subiendo.
          value: r.value + (r.deviceOffset ?? 0),
        }))
    : [];

  // Igual que canAddReading() real: sin lectura previa siempre se permite;
  // si ya hay una, solo se permite otra cuando ya pasó la fecha de la
  // próxima lectura vencida.
  const canAddReading = meter ? !meter.nextReadingDue || meter.pastDue : false;

  return (
    <Drawer anchor="right" open={!!meter} onClose={onClose} PaperProps={{ sx: { width: { xs: '90%', sm: '70%', md: '50%' } } }}>
      {meter && (
        <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', p: 2, borderBottom: '1px solid', borderColor: 'divider' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <IconButton size="small" onClick={onClose}>
                <ArrowBackIcon fontSize="small" />
              </IconButton>
              <Typography variant="h5" sx={{ fontWeight: 700 }}>
                {meter.name}
              </Typography>
            </Box>
            <Box>
              <IconButton size="small" onClick={() => setEditOpen(true)} sx={{ color: 'primary.main' }}>
                <EditTwoToneIcon fontSize="small" />
              </IconButton>
              {/* Deshabilitar: oculta el medidor sin borrarlo. Requiere el
                  mismo permiso que eliminar, porque afecta a todo el equipo. */}
              {hasDeletePermission('METERS', registroPermiso) && (
                <MuiTooltip title={meter.disabled ? 'Habilitar medidor' : 'Deshabilitar medidor'}>
                  <IconButton size="small" onClick={handleToggleDisabled} sx={{ color: 'warning.main' }}>
                    {meter.disabled ? (
                      <VisibilityTwoToneIcon fontSize="small" />
                    ) : (
                      <VisibilityOffTwoToneIcon fontSize="small" />
                    )}
                  </IconButton>
                </MuiTooltip>
              )}
              {/* Reemplazo de equipo fisico: el contador nuevo arranca en
                  cero, pero el acumulado del medidor sigue. Lo autoriza un
                  supervisor, por eso pide el mismo permiso que eliminar. */}
              {hasDeletePermission('METERS', registroPermiso) && (
                <MuiTooltip title="Reemplazar medidor físico">
                  <IconButton size="small" onClick={() => setReplaceOpen(true)} sx={{ color: 'info.main' }}>
                    <SwapHorizTwoToneIcon fontSize="small" />
                  </IconButton>
                </MuiTooltip>
              )}
              <IconButton size="small" onClick={handleDeleteMeter} sx={{ color: 'error.main' }}>
                <DeleteTwoToneIcon fontSize="small" />
              </IconButton>
            </Box>
          </Box>

          <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ px: 2, borderBottom: '1px solid', borderColor: 'divider' }}>
            <Tab value="details" label="Detalles" />
            <Tab value="history" label="Historial" />
            <Tab value="devices" label="Reemplazos" />
          </Tabs>

          {error && (
            <Alert severity="error" sx={{ mx: 2, mt: 2 }} onClose={() => setError(null)}>
              {error}
            </Alert>
          )}

          <Box sx={{ p: 3, flex: 1, overflowY: 'auto' }}>
            {tab === 'details' && (
              <>
                {/* Tras un reemplazo, el acumulado difiere de la lectura
                    fisica. Se muestran ambos para que nadie piense que hay
                    un error al comparar con el equipo o con el movil. */}
                {/* Se muestra cuando el medidor ha sido reemplazado alguna
                    vez, es decir cuando hay arrastre. Antes dependia de que
                    acumulado y lectura fisica difirieran, y desaparecia
                    justo despues de un reemplazo -- cuando mas hace falta. */}
                {devices.length > 1 && (
                  <Alert severity="info" sx={{ mb: 2 }}>
                    <strong>Medidor reemplazado</strong>
                    {meter.deviceSerialNumber && ` — equipo actual: ${meter.deviceSerialNumber}`}
                    {meter.deviceInstalledAt &&
                      `, instalado el ${new Date(meter.deviceInstalledAt).toLocaleDateString()}`}
                    {devices[devices.length - 1]?.replacedByName &&
                      ` por ${devices[devices.length - 1].replacedByName}`}
                    {'. '}
                    {meter.accumulatedReading != null && (
                      <>
                        Acumulado: <strong>{meter.accumulatedReading.toFixed(1)} {meter.unit}</strong>
                        {meter.lastReading != null &&
                          ` (el equipo marca ${meter.lastReading.toFixed(1)} ${meter.unit ?? ''})`}
                        .
                      </>
                    )}
                  </Alert>
                )}
                <Box sx={{ display: 'flex', gap: 1.5, mb: 2 }}>
                  <TextField
                    size="small"
                    type="date"
                    label="Desde"
                    value={dateFrom}
                    onChange={(e) => setDateFrom(e.target.value)}
                    InputLabelProps={{ shrink: true }}
                  />
                  <TextField
                    size="small"
                    type="date"
                    label="Hasta"
                    value={dateTo}
                    onChange={(e) => setDateTo(e.target.value)}
                    InputLabelProps={{ shrink: true }}
                  />
                </Box>
                {chartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={260}>
                    <LineChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" />
                      <YAxis />
                      <Tooltip />
                      <Line type="monotone" dataKey="value" stroke="#5b6df8" />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <Typography variant="body2" sx={{ color: 'text.secondary', textAlign: 'center', py: 4 }}>
                    Sin lecturas todavía para graficar.
                  </Typography>
                )}

                <Box sx={{ display: 'flex', gap: 1, mt: 2, mb: 3, alignItems: 'center' }}>
                  {canAddReading ? (
                    <>
                      <TextField
                        size="small"
                        type="number"
                        label="Nueva lectura"
                        value={newReadingValue}
                        onChange={(e) => setNewReadingValue(e.target.value)}
                        inputProps={{ step: 0.1 }}
                      />
                      <Button
                        variant="contained"
                        onClick={handleAddReading}
                        disabled={addingReading}
                        sx={{ alignSelf: 'center' }}
                      >
                        Agregar lectura
                      </Button>
                    </>
                  ) : (
                    <Alert severity="info" sx={{ width: '100%' }}>
                      Ya se registró una lectura para el período actual. Podrás registrar la próxima el{' '}
                      {meter.nextReadingDue ? new Date(meter.nextReadingDue).toLocaleDateString() : '—'}.
                    </Alert>
                  )}
                </Box>

                <Typography variant="h6" sx={{ mb: 1.5 }}>
                  Detalles del medidor
                </Typography>
                <Grid container spacing={2} sx={{ mb: 3 }}>
                  <Field label="Ubicación" value={meter.locationName} />
                  <Field label="Activo" value={meter.assetName} />
                  <Field label="Frecuencia de lectura" value={`Cada ${meter.updateFrequencyDays} días`} />
                  <Field label="Categoría" value={meter.categoryName} />
                  <Field label="Asignado a" value={meter.assignedUserNames.length > 0 ? meter.assignedUserNames.join(', ') : '—'} />
                </Grid>

                <Typography variant="h6" sx={{ mb: 1 }}>
                  Disparadores de orden de trabajo
                </Typography>
                <List>
                  {triggers.map((t) => (
                    <ListItem
                      key={t.id}
                      secondaryAction={
                        <Stack spacing={0.5} direction="row">
                          <IconButton size="small" onClick={() => openEditTriggerForm(t)}>
                            <EditTwoToneIcon fontSize="small" />
                          </IconButton>
                          <IconButton size="small" onClick={() => handleDeleteTrigger(t.id)}>
                            <DeleteTwoToneIcon fontSize="small" color="error" />
                          </IconButton>
                        </Stack>
                      }
                    >
                      <ListItemText
                        primary={t.name}
                        secondary={`${t.condition === 'LESS_THAN' ? 'Menor a' : 'Mayor a'} ${t.value} ${meter.unit ?? ''} → "${t.workOrderTitle}"`}
                      />
                    </ListItem>
                  ))}
                </List>
                <Button startIcon={<AddTwoToneIcon />} variant="outlined" onClick={openNewTriggerForm}>
                  Agregar disparador
                </Button>
              </>
            )}

            {tab === 'history' && (
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Valor</TableCell>
                    <TableCell>Fecha</TableCell>
                    <TableCell>Registrado por</TableCell>
                    <TableCell align="right"></TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {[...meter.readings]
                    .sort((a, b) => new Date(b.readingDate).getTime() - new Date(a.readingDate).getTime())
                    .map((r) => (
                      <TableRow key={r.id}>
                        <TableCell>
                          {r.value} {meter.unit ?? ''}
                        </TableCell>
                        <TableCell>{new Date(r.readingDate).toLocaleString()}</TableCell>
                        <TableCell>{r.createdByName ?? '—'}</TableCell>
                        <TableCell align="right">
                          {/* Corregir o borrar una lectura reescribe el
                              historico de consumo, asi que solo lo hace
                              quien pueda eliminar medidores -- un
                              supervisor, no el tecnico que la registro.
                              El backend valida lo mismo. */}
                          {hasDeletePermission('METERS', registroPermiso) && (
                            <>
                              <IconButton
                                size="small"
                                onClick={() => { setEditingReading(r); setEditValue(String(r.value)); }}
                              >
                                <EditTwoToneIcon fontSize="small" color="primary" />
                              </IconButton>
                              <IconButton size="small" onClick={() => handleDeleteReading(r.id)}>
                                <DeleteTwoToneIcon fontSize="small" color="error" />
                              </IconButton>
                            </>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  {meter.readings.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={4}>
                        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                          Sin lecturas registradas.
                        </Typography>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            )}

            {tab === 'devices' && (
              <Box sx={{ p: 2 }}>
                <Typography variant="body2" sx={{ color: 'text.secondary', mb: 2 }}>
                  Cada vez que se reemplaza el contador físico, el nuevo arranca en cero pero hereda
                  como arrastre lo que acumuló el anterior. Así el consumo acumulado del medidor no
                  se reinicia.
                </Typography>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Serie</TableCell>
                      <TableCell>Instalado</TableCell>
                      <TableCell>Retirado</TableCell>
                      <TableCell align="right">Arrastre</TableCell>
                      <TableCell align="right">Lecturas</TableCell>
                      <TableCell>Autorizó</TableCell>
                      <TableCell>Motivo</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {[...devices].reverse().map((d) => (
                      <TableRow key={d.id} sx={{ bgcolor: !d.removedAt ? 'action.hover' : undefined }}>
                        <TableCell sx={{ fontWeight: !d.removedAt ? 700 : 400 }}>
                          {d.serialNumber ?? '—'}
                          {!d.removedAt && (
                            <Chip label="Actual" size="small" color="success" sx={{ ml: 1 }} />
                          )}
                        </TableCell>
                        <TableCell>{new Date(d.installedAt).toLocaleDateString()}</TableCell>
                        <TableCell>
                          {d.removedAt ? new Date(d.removedAt).toLocaleDateString() : '—'}
                        </TableCell>
                        <TableCell align="right">
                          {d.offsetValue.toFixed(1)} {meter.unit ?? ''}
                        </TableCell>
                        <TableCell align="right">{d.readingCount}</TableCell>
                        <TableCell>{d.replacedByName ?? '—'}</TableCell>
                        <TableCell>{d.notes ?? '—'}</TableCell>
                      </TableRow>
                    ))}
                    {devices.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={7} sx={{ color: 'text.secondary' }}>
                          Sin equipos registrados.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </Box>
            )}
          </Box>
        </Box>
      )}

      <CreateMeterDialog open={editOpen} onClose={() => setEditOpen(false)} onSaved={onChanged} editMeter={meter} />
      <AddTriggerDialog
        open={triggerDialogOpen}
        onClose={() => setTriggerDialogOpen(false)}
        onSaved={reloadTriggers}
        meter={meter}
        editTrigger={editingTrigger}
      />

      <Dialog open={!!editingReading} onClose={() => setEditingReading(null)} maxWidth="xs" fullWidth>
        <DialogTitle>Editar lectura</DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          <TextField
            label={`Valor${meter?.unit ? ` (${meter.unit})` : ''}`}
            type="number"
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            inputProps={{ step: 0.1 }}
            fullWidth
            autoFocus
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditingReading(null)}>Cancelar</Button>
          <Button variant="contained" onClick={handleSaveEditedReading} disabled={savingReading || !editValue}>
            {savingReading ? 'Guardando…' : 'Guardar'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Reemplazo del equipo fisico. */}
      <Dialog open={replaceOpen} onClose={() => setReplaceOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Reemplazar medidor físico</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 2.5 }}>
          <Alert severity="info">
            El contador nuevo arranca en cero, pero el consumo acumulado del medidor continúa: el
            equipo entrante hereda {meter?.accumulatedReading?.toFixed(1) ?? '0'} {meter?.unit ?? ''}{' '}
            del anterior.
          </Alert>
          <TextField
            label="Número de serie del equipo nuevo"
            value={newSerial}
            onChange={(e) => setNewSerial(e.target.value)}
            fullWidth
            autoFocus
            helperText="Opcional, pero permite rastrear qué equipo dio cada lectura."
          />
          <TextField
            label="Motivo del reemplazo"
            value={replaceNotes}
            onChange={(e) => setReplaceNotes(e.target.value)}
            multiline
            minRows={2}
            fullWidth
            placeholder="Medidor dañado, calibración vencida…"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setReplaceOpen(false)}>Cancelar</Button>
          <Button variant="contained" onClick={handleReplaceDevice} disabled={replacing}>
            {replacing ? 'Registrando…' : 'Registrar reemplazo'}
          </Button>
        </DialogActions>
      </Dialog>

      <ConfirmDialog
        open={!!confirmState}
        onCancel={() => setConfirmState(null)}
        onConfirm={() => {
          confirmState?.onConfirm();
          setConfirmState(null);
        }}
        confirmText={confirmState?.confirmText ?? 'Borrar'}
        question={confirmState?.question ?? ''}
      />
    </Drawer>
  );
}
