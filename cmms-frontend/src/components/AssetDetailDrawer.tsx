import { useEffect, useState } from 'react';
import {
  Drawer,
  Box,
  Typography,
  IconButton,
  Chip,
  Divider,
  Grid,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  Paper,
  Tabs,
  Tab,
  Button,
  TextField,
  MenuItem,
  Alert,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBackRounded';
import EditTwoToneIcon from '@mui/icons-material/EditTwoTone';
import AddIcon from '@mui/icons-material/AddRounded';
import { assetsApi, type AssetCostSummary } from '../api/assets';
import type { AssetResponse, WorkOrder, AssetAnalytics, AssetDowntimeEntry, MeterEntry, MeterTriggerEntry, FileAttachment } from '../types';
import { STATUS_LABELS, PRIORITY_LABELS, PRIORITY_COLORS, ASSET_STATUS_LABELS, ASSET_STATUS_COLORS } from '../constants';
import { ApiRequestError } from '../api/client';

interface Props {
  asset: AssetResponse | null;
  onClose: () => void;
  onEdit: (asset: AssetResponse) => void;
  onSelectWorkOrder: (id: number) => void;
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

function money(n: number) {
  return `$${n.toFixed(2)}`;
}

type TabKey = 'details' | 'work-orders' | 'parts' | 'files' | 'meters' | 'downtimes' | 'analytics';

export default function AssetDetailDrawer({ asset, onClose, onEdit, onSelectWorkOrder }: Props) {
  const [tab, setTab] = useState<TabKey>('details');
  const [history, setHistory] = useState<WorkOrder[]>([]);
  const [costs, setCosts] = useState<AssetCostSummary | null>(null);
  const [analytics, setAnalytics] = useState<AssetAnalytics | null>(null);
  const [downtimes, setDowntimes] = useState<AssetDowntimeEntry[]>([]);
  const [meters, setMeters] = useState<MeterEntry[]>([]);
  const [files, setFiles] = useState<FileAttachment[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [newMeterName, setNewMeterName] = useState('');
  const [newMeterUnit, setNewMeterUnit] = useState('');
  const [readingInputs, setReadingInputs] = useState<Record<number, string>>({});
  const [expandedMeterId, setExpandedMeterId] = useState<number | null>(null);
  const [triggers, setTriggers] = useState<Record<number, MeterTriggerEntry[]>>({});
  const [newTriggerCondition, setNewTriggerCondition] = useState<'LESS_THAN' | 'GREATER_THAN'>('LESS_THAN');
  const [newTriggerValue, setNewTriggerValue] = useState('');
  const [newTriggerName, setNewTriggerName] = useState('');
  const [newTriggerTitle, setNewTriggerTitle] = useState('');

  useEffect(() => {
    if (!asset) return;
    setTab('details');
    setLoading(true);
    const end = new Date().toISOString();
    const start = new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString();
    Promise.all([
      assetsApi.getWorkOrderHistory(asset.id),
      assetsApi.getCostSummary(asset.id),
      assetsApi.getAnalytics(asset.id, start, end),
      assetsApi.getDowntimes(asset.id),
      assetsApi.getMeters(asset.id),
      assetsApi.getFiles(asset.id),
    ])
      .then(([h, c, a, d, m, f]) => {
        setHistory(h);
        setCosts(c);
        setAnalytics(a);
        setDowntimes(d);
        setMeters(m);
        setFiles(f);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [asset]);

  async function handleAddMeter() {
    if (!asset || !newMeterName.trim()) return;
    try {
      await assetsApi.createMeter(asset.id, newMeterName.trim(), newMeterUnit || undefined, 30);
      setNewMeterName('');
      setNewMeterUnit('');
      setMeters(await assetsApi.getMeters(asset.id));
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : 'No se pudo crear el medidor');
    }
  }

  async function handleAddReading(meterId: number) {
    const value = readingInputs[meterId];
    if (!value) return;
    try {
      await assetsApi.addMeterReading(meterId, Number(value));
      setReadingInputs((prev) => ({ ...prev, [meterId]: '' }));
      if (asset) setMeters(await assetsApi.getMeters(asset.id));
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : 'No se pudo registrar la lectura');
    }
  }

  async function toggleTriggers(meterId: number) {
    if (expandedMeterId === meterId) {
      setExpandedMeterId(null);
      return;
    }
    setExpandedMeterId(meterId);
    try {
      const list = await assetsApi.getMeterTriggers(meterId);
      setTriggers((prev) => ({ ...prev, [meterId]: list }));
    } catch {
      setTriggers((prev) => ({ ...prev, [meterId]: [] }));
    }
  }

  async function handleAddTrigger(meterId: number) {
    if (!newTriggerValue || !newTriggerTitle.trim() || !newTriggerName.trim()) return;
    try {
      await assetsApi.createMeterTrigger(meterId, {
        name: newTriggerName.trim(),
        condition: newTriggerCondition,
        value: Number(newTriggerValue),
        workOrderTitle: newTriggerTitle.trim(),
        priority: 'MEDIUM',
      });
      setNewTriggerValue('');
      setNewTriggerTitle('');
      setNewTriggerName('');
      setTriggers((prev) => ({ ...prev, [meterId]: [] }));
      const list = await assetsApi.getMeterTriggers(meterId);
      setTriggers((prev) => ({ ...prev, [meterId]: list }));
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : 'No se pudo crear el umbral');
    }
  }

  async function handleDeleteTrigger(meterId: number, triggerId: number) {
    try {
      await assetsApi.deleteMeterTrigger(triggerId);
      setTriggers((prev) => ({ ...prev, [meterId]: (prev[meterId] ?? []).filter((t) => t.id !== triggerId) }));
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : 'No se pudo eliminar el umbral');
    }
  }

  async function handleUploadFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !asset) return;
    try {
      await assetsApi.uploadFile(asset.id, file);
      setFiles(await assetsApi.getFiles(asset.id));
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : 'No se pudo subir el archivo');
    } finally {
      e.target.value = '';
    }
  }

  function formatHours(h: number) {
    return `${h.toFixed(1)}h`;
  }

  return (
    <Drawer anchor="right" open={!!asset} onClose={onClose} PaperProps={{ sx: { width: { xs: '90%', sm: '80%', md: '60%' } } }}>
      {asset && (
        <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', p: 2, borderBottom: '1px solid', borderColor: 'divider' }}>
            <IconButton size="small" onClick={onClose} sx={{ ml: -1 }}>
              <ArrowBackIcon fontSize="small" />
            </IconButton>
            <IconButton size="small" onClick={() => onEdit(asset)} sx={{ color: 'primary.main' }}>
              <EditTwoToneIcon fontSize="small" />
            </IconButton>
          </Box>

          <Box sx={{ px: 3, pt: 2 }}>
            <Chip
              label={ASSET_STATUS_LABELS[asset.status]}
              size="small"
              color={ASSET_STATUS_COLORS[asset.status]}
              sx={{ mb: 1 }}
            />
            <Typography variant="h5" sx={{ fontWeight: 700 }}>
              {asset.name}
            </Typography>
            <Typography variant="body2" sx={{ color: 'text.secondary', mt: 0.5 }}>
              {asset.categoryName ?? 'Sin categoría'} {asset.model ? `· ${asset.model}` : ''} {asset.customId ? `· ${asset.customId}` : ''}
            </Typography>
          </Box>

          <Tabs value={tab} onChange={(_, v) => setTab(v)} variant="scrollable" sx={{ px: 2, borderBottom: '1px solid', borderColor: 'divider' }}>
            <Tab value="details" label="Detalles" />
            <Tab value="work-orders" label={`Órdenes (${history.length})`} />
            <Tab value="parts" label={`Repuestos (${asset.parts.length})`} />
            <Tab value="files" label={`Archivos (${files.length})`} />
            <Tab value="meters" label={`Medidores (${meters.length})`} />
            <Tab value="downtimes" label={`Inactividad (${downtimes.length})`} />
            <Tab value="analytics" label="Analítica" />
          </Tabs>

          {error && (
            <Alert severity="error" sx={{ mx: 3, mt: 2 }} onClose={() => setError(null)}>
              {error}
            </Alert>
          )}

          <Box sx={{ p: 3, flex: 1, overflowY: 'auto' }}>
            {tab === 'details' && (
              <>
                <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1.5 }}>
                  Detalles
                </Typography>
                <Grid container spacing={2} sx={{ mb: 2 }}>
                  <Field label="Ubicación" value={asset.locationName} />
                  <Field label="Activo padre" value={asset.parentAssetName} />
                  <Field label="Número de serie" value={asset.serialNumber} />
                  <Field label="Fabricante" value={asset.manufacturer} />
                  <Field label="Modelo" value={asset.model} />
                  <Field label="Potencia" value={asset.power} />
                  <Field label="Área/zona" value={asset.area} />
                  <Field label="Código de barras" value={asset.barCode} />
                  <Field label="ID NFC" value={asset.nfcId} />
                  <Field label="Usuario principal" value={asset.primaryUserName} />
                  <Field label="Costo de adquisición" value={asset.acquisitionCost != null ? money(asset.acquisitionCost) : '—'} />
                  <Field label="Fecha de adquisición" value={asset.acquisitionDate ? new Date(asset.acquisitionDate).toLocaleDateString() : '—'} />
                  <Field label="Vencimiento de garantía" value={asset.warrantyExpirationDate ? new Date(asset.warrantyExpirationDate).toLocaleDateString() : '—'} />
                  <Field label="Puesta en servicio" value={asset.inServiceDate ? new Date(asset.inServiceDate).toLocaleDateString() : '—'} />
                </Grid>

                {asset.description && (
                  <>
                    <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                      Descripción
                    </Typography>
                    <Typography variant="body2" sx={{ mb: 2 }}>
                      {asset.description}
                    </Typography>
                  </>
                )}

                {asset.deprecation && (
                  <>
                    <Divider sx={{ my: 2 }} />
                    <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1.5 }}>
                      Depreciación
                    </Typography>
                    <Grid container spacing={2} sx={{ mb: 2 }}>
                      <Field label="Precio de compra" value={asset.deprecation.purchasePrice != null ? money(asset.deprecation.purchasePrice) : '—'} />
                      <Field label="Valor residual" value={asset.deprecation.residualValue != null ? money(asset.deprecation.residualValue) : '—'} />
                      <Field label="Tasa anual" value={asset.deprecation.rate != null ? `${asset.deprecation.rate}%` : '—'} />
                    </Grid>
                  </>
                )}

                {(asset.assignedUsers.length > 0 || asset.teams.length > 0 || asset.vendors.length > 0) && (
                  <>
                    <Divider sx={{ my: 2 }} />
                    <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1.5 }}>
                      Personas y relaciones
                    </Typography>
                    {asset.assignedUsers.length > 0 && (
                      <Box sx={{ mb: 1 }}>
                        <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                          Usuarios asignados
                        </Typography>
                        <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', mt: 0.5 }}>
                          {asset.assignedUsers.map((u) => (
                            <Chip key={u.id} label={u.name} size="small" />
                          ))}
                        </Box>
                      </Box>
                    )}
                    {asset.teams.length > 0 && (
                      <Box sx={{ mb: 1 }}>
                        <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                          Equipos
                        </Typography>
                        <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', mt: 0.5 }}>
                          {asset.teams.map((t) => (
                            <Chip key={t.id} label={t.name} size="small" />
                          ))}
                        </Box>
                      </Box>
                    )}
                    {asset.vendors.length > 0 && (
                      <Box>
                        <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                          Contratistas
                        </Typography>
                        <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', mt: 0.5 }}>
                          {asset.vendors.map((v) => (
                            <Chip key={v.id} label={v.name} size="small" />
                          ))}
                        </Box>
                      </Box>
                    )}
                  </>
                )}
              </>
            )}

            {tab === 'work-orders' && (
              <>
                <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1.5 }}>
                  Costo total invertido
                </Typography>
                {costs && (
                  <>
                    <Paper variant="outlined" sx={{ p: 2, mb: 2, bgcolor: '#f8f9fc' }}>
                      <Typography variant="h4" sx={{ fontWeight: 700, color: 'primary.main' }}>
                        {money(costs.totalCost)}
                      </Typography>
                      <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                        Sumado sobre {costs.workOrderCount} orden{costs.workOrderCount === 1 ? '' : 'es'} de trabajo (
                        {costs.completedWorkOrderCount} completada{costs.completedWorkOrderCount === 1 ? '' : 's'})
                      </Typography>
                    </Paper>
                    <Grid container spacing={2} sx={{ mb: 2 }}>
                      <Field label="Mano de obra" value={money(costs.laborCost)} />
                      <Field label="Repuestos" value={money(costs.partsCost)} />
                      <Field label="Costos adicionales" value={money(costs.additionalCost)} />
                    </Grid>
                  </>
                )}

                <Divider sx={{ my: 2 }} />
                <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1.5 }}>
                  Historial de órdenes de trabajo
                </Typography>
                {history.length === 0 ? (
                  <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                    Este activo todavía no tiene órdenes de trabajo.
                  </Typography>
                ) : (
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>ID</TableCell>
                        <TableCell>Título</TableCell>
                        <TableCell>Estado</TableCell>
                        <TableCell>Prioridad</TableCell>
                        <TableCell>Creada</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {history.map((wo) => (
                        <TableRow key={wo.id} hover onClick={() => onSelectWorkOrder(wo.id)} sx={{ cursor: 'pointer' }}>
                          <TableCell sx={{ fontFamily: 'monospace', fontSize: 12.5 }}>WO{String(wo.id).padStart(6, '0')}</TableCell>
                          <TableCell sx={{ fontWeight: 500 }}>{wo.title}</TableCell>
                          <TableCell>
                            <Chip label={STATUS_LABELS[wo.status]} size="small" variant="outlined" />
                          </TableCell>
                          <TableCell>
                            <Chip label={PRIORITY_LABELS[wo.priority]} size="small" sx={{ bgcolor: PRIORITY_COLORS[wo.priority].bg, color: PRIORITY_COLORS[wo.priority].text }} />
                          </TableCell>
                          <TableCell sx={{ fontSize: 12.5 }}>{new Date(wo.createdAt).toLocaleDateString()}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </>
            )}

            {tab === 'parts' && (
              <>
                <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1.5 }}>
                  Repuestos asociados
                </Typography>
                {asset.parts.length === 0 ? (
                  <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                    Sin repuestos asociados. Edita el activo para agregar.
                  </Typography>
                ) : (
                  <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                    {asset.parts.map((p) => (
                      <Chip key={p.id} label={p.name} />
                    ))}
                  </Box>
                )}
              </>
            )}

            {tab === 'files' && (
              <>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                    Archivos
                  </Typography>
                  <Button component="label" size="small" startIcon={<AddIcon />}>
                    Subir archivo
                    <input type="file" hidden onChange={handleUploadFile} />
                  </Button>
                </Box>
                {files.length === 0 ? (
                  <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                    Sin archivos todavía.
                  </Typography>
                ) : (
                  files.map((f) => (
                    <Box key={f.id} sx={{ display: 'flex', justifyContent: 'space-between', py: 1, borderBottom: '1px solid', borderColor: 'divider' }}>
                      <Typography
                        variant="body2"
                        component="a"
                        href={f.downloadUrl}
                        target="_blank"
                        rel="noreferrer"
                        sx={{ color: 'primary.main', textDecoration: 'none' }}
                      >
                        {f.fileName}
                      </Typography>
                      <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                        {f.uploadedByName ?? '—'}
                      </Typography>
                    </Box>
                  ))
                )}
              </>
            )}

            {tab === 'meters' && (
              <>
                <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1.5 }}>
                  Medidores
                </Typography>
                {meters.map((m) => (
                  <Paper key={m.id} variant="outlined" sx={{ p: 2, mb: 1.5 }}>
                    <Typography variant="body2" sx={{ fontWeight: 700 }}>
                      {m.name} {m.unit ? `(${m.unit})` : ''}
                    </Typography>
                    <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                      Última lectura: {m.lastReading != null ? m.lastReading : '—'}{' '}
                      {m.lastReadingDate ? `el ${new Date(m.lastReadingDate).toLocaleDateString()}` : ''}
                    </Typography>
                    <Box sx={{ display: 'flex', gap: 1, mt: 1 }}>
                      <TextField
                        size="small"
                        type="number"
                        placeholder="Nueva lectura"
                        value={readingInputs[m.id] ?? ''}
                        onChange={(e) => setReadingInputs((prev) => ({ ...prev, [m.id]: e.target.value }))}
                      />
                      <Button size="small" onClick={() => handleAddReading(m.id)}>
                        Registrar
                      </Button>
                      <Button size="small" onClick={() => toggleTriggers(m.id)}>
                        {expandedMeterId === m.id ? 'Ocultar umbrales' : 'Umbrales'}
                      </Button>
                    </Box>

                    {expandedMeterId === m.id && (
                      <Box sx={{ mt: 1.5, pt: 1.5, borderTop: '1px solid', borderColor: 'divider' }}>
                        <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mb: 1 }}>
                          Si una lectura cruza el umbral, se genera una orden de trabajo sola y se avisa a los
                          usuarios asignados a este medidor.
                        </Typography>
                        {(triggers[m.id] ?? []).map((t) => (
                          <Box key={t.id} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', py: 0.5 }}>
                            <Typography variant="body2">
                              <strong>{t.name}</strong> — {t.condition === 'LESS_THAN' ? 'Menor a' : 'Mayor a'} {t.value} → "{t.workOrderTitle}"
                            </Typography>
                            <IconButton size="small" onClick={() => handleDeleteTrigger(m.id, t.id)}>
                              ✕
                            </IconButton>
                          </Box>
                        ))}
                        {(triggers[m.id] ?? []).length === 0 && (
                          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                            Sin umbrales configurados.
                          </Typography>
                        )}
                        <Box sx={{ display: 'flex', gap: 1, mt: 1, flexWrap: 'wrap' }}>
                          <TextField
                            size="small"
                            placeholder="Nombre del disparador"
                            value={newTriggerName}
                            onChange={(e) => setNewTriggerName(e.target.value)}
                            sx={{ width: 160 }}
                          />
                          <TextField
                            select
                            size="small"
                            value={newTriggerCondition}
                            onChange={(e) => setNewTriggerCondition(e.target.value as 'LESS_THAN' | 'GREATER_THAN')}
                            sx={{ width: 120 }}
                          >
                            <MenuItem value="LESS_THAN">Menor a</MenuItem>
                            <MenuItem value="GREATER_THAN">Mayor a</MenuItem>
                          </TextField>
                          <TextField
                            size="small"
                            type="number"
                            placeholder="Valor"
                            value={newTriggerValue}
                            onChange={(e) => setNewTriggerValue(e.target.value)}
                            sx={{ width: 100 }}
                          />
                          <TextField
                            size="small"
                            placeholder="Título de la orden a generar"
                            value={newTriggerTitle}
                            onChange={(e) => setNewTriggerTitle(e.target.value)}
                            sx={{ flex: 1, minWidth: 160 }}
                          />
                          <Button size="small" startIcon={<AddIcon />} onClick={() => handleAddTrigger(m.id)}>
                            Agregar
                          </Button>
                        </Box>
                      </Box>
                    )}
                  </Paper>
                ))}
                <Divider sx={{ my: 2 }} />
                <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>
                  Agregar medidor
                </Typography>
                <Box sx={{ display: 'flex', gap: 1 }}>
                  <TextField size="small" placeholder="Nombre" value={newMeterName} onChange={(e) => setNewMeterName(e.target.value)} />
                  <TextField size="small" placeholder="Unidad (ej. horas)" value={newMeterUnit} onChange={(e) => setNewMeterUnit(e.target.value)} />
                  <Button size="small" startIcon={<AddIcon />} onClick={handleAddMeter}>
                    Agregar
                  </Button>
                </Box>
              </>
            )}

            {tab === 'downtimes' && (
              <>
                <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1.5 }}>
                  Tiempos de inactividad
                </Typography>
                <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mb: 2 }}>
                  Se registran automáticamente cuando cambias el estado del activo a uno "caído" (Averiado, Parada de
                  emergencia) y se cierran al volver a un estado operativo.
                </Typography>
                {downtimes.length === 0 ? (
                  <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                    Sin periodos de inactividad registrados.
                  </Typography>
                ) : (
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>Inicio</TableCell>
                        <TableCell>Fin</TableCell>
                        <TableCell>Duración</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {downtimes.map((d) => (
                        <TableRow key={d.id}>
                          <TableCell sx={{ fontSize: 12.5 }}>{new Date(d.startsOn).toLocaleString()}</TableCell>
                          <TableCell sx={{ fontSize: 12.5 }}>{d.endsOn ? new Date(d.endsOn).toLocaleString() : 'En curso'}</TableCell>
                          <TableCell sx={{ fontSize: 12.5 }}>
                            {d.durationSeconds != null ? `${(d.durationSeconds / 3600).toFixed(1)}h` : '—'}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </>
            )}

            {tab === 'analytics' && (
              <>
                <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 0.5 }}>
                  Estadísticas (últimos 30 días)
                </Typography>
                {loading ? (
                  <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                    Calculando…
                  </Typography>
                ) : analytics ? (
                  <Grid container spacing={2} sx={{ mt: 1 }}>
                    {[
                      ['MTBF', `${analytics.mtbfHours.toFixed(1)}h`],
                      ['MTTR', `${analytics.mttrHours.toFixed(1)}h`],
                      ['Horas de inactividad', formatHours(analytics.downtimeHours)],
                      ['Horas de actividad', formatHours(analytics.uptimeHours)],
                      ['Costo total', money(analytics.totalCost)],
                    ].map(([label, value]) => (
                      <Grid item xs={6} sm={4} key={label}>
                        <Paper variant="outlined" sx={{ p: 2, textAlign: 'center' }}>
                          <Typography variant="h5" sx={{ fontWeight: 700 }}>
                            {value}
                          </Typography>
                          <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                            {label}
                          </Typography>
                        </Paper>
                      </Grid>
                    ))}
                  </Grid>
                ) : (
                  <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                    No se pudo calcular.
                  </Typography>
                )}
              </>
            )}
          </Box>
        </Box>
      )}
    </Drawer>
  );
}
