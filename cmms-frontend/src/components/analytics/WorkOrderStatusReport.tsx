import { useEffect, useState } from 'react';
import { Box, Grid, Paper, Typography, TextField, Stack } from '@mui/material';
import { PieChart, Pie, Cell, Legend, Tooltip, ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, ComposedChart, Bar, Line } from 'recharts';
import { workOrderAnalyticsApi, type WOStats, type WOStatuses, type WOIncompleteStats, type WOStatusesByDate, type WOHours, type WOStatsByPriority } from '../../api/workOrderAnalytics';

const STATUS_COLORS: Record<string, string> = {
  Abierta: '#8891a8',
  'En espera': '#f2a93b',
  'En progreso': '#4caf50',
  Completada: '#5b6df8',
};

function defaultRange() {
  const end = new Date();
  const start = new Date();
  start.setMonth(start.getMonth() - 1);
  return { start, end };
}

export default function WorkOrderStatusReport() {
  const [{ start, end }, setRange] = useState(defaultRange());
  const [stats, setStats] = useState<WOStats | null>(null);
  const [statuses, setStatuses] = useState<WOStatuses | null>(null);
  const [incomplete, setIncomplete] = useState<WOIncompleteStats | null>(null);
  const [byDate, setByDate] = useState<WOStatusesByDate[]>([]);
  const [hours, setHours] = useState<WOHours | null>(null);
  const [byPriority, setByPriority] = useState<WOStatsByPriority | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const range = { start: start.toISOString(), end: end.toISOString() };
    setLoading(true);
    Promise.all([
      workOrderAnalyticsApi.getOverview(range),
      workOrderAnalyticsApi.getStatuses(range),
      workOrderAnalyticsApi.getIncompleteOverview(range),
      workOrderAnalyticsApi.getStatusesByDate(range),
      workOrderAnalyticsApi.getHours(range),
      workOrderAnalyticsApi.getIncompleteByPriority(range),
    ])
      .then(([s, st, inc, bd, h, bp]) => {
        setStats(s);
        setStatuses(st);
        setIncomplete(inc);
        setByDate(bd);
        setHours(h);
        setByPriority(bp);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [start, end]);

  // Igual que el real: la torta solo muestra el estado de lo INCOMPLETO
  // (no incluye "Completada").
  const pieData = statuses
    ? [
        { name: 'Abierta', value: statuses.open },
        { name: 'En espera', value: statuses.onHold },
        { name: 'En progreso', value: statuses.inProgress },
      ].filter((d) => d.value > 0)
    : [];

  const priorityData = byPriority
    ? [
        { name: 'High', 'Órdenes de trabajo': byPriority.high.count, 'Duración estimada en horas': byPriority.high.estimatedHours },
        { name: 'Medium', 'Órdenes de trabajo': byPriority.medium.count, 'Duración estimada en horas': byPriority.medium.estimatedHours },
        { name: 'Low', 'Órdenes de trabajo': byPriority.low.count, 'Duración estimada en horas': byPriority.low.estimatedHours },
        { name: 'None', 'Órdenes de trabajo': byPriority.none.count, 'Duración estimada en horas': byPriority.none.estimatedHours },
      ]
    : [];

  const precisionRatio = hours && hours.actual > 0 ? (hours.estimated / hours.actual).toFixed(2) : '—';

  const trendData = byDate.map((d) => ({
    date: new Date(d.date).toLocaleDateString(),
    Abierta: d.open,
    'En espera': d.onHold,
    'En progreso': d.inProgress,
    Completada: d.complete,
  }));

  return (
    <Box>
      <Stack direction="row" spacing={2} sx={{ mb: 3 }}>
        <TextField
          size="small"
          type="date"
          label="Desde"
          value={start.toISOString().slice(0, 10)}
          onChange={(e) => setRange((prev) => ({ ...prev, start: new Date(e.target.value) }))}
          InputLabelProps={{ shrink: true }}
        />
        <TextField
          size="small"
          type="date"
          label="Hasta"
          value={end.toISOString().slice(0, 10)}
          onChange={(e) => setRange((prev) => ({ ...prev, end: new Date(e.target.value) }))}
          InputLabelProps={{ shrink: true }}
        />
      </Stack>

      {loading ? (
        <Typography sx={{ color: 'text.secondary' }}>Cargando…</Typography>
      ) : (
        <Grid container spacing={2}>
          <Grid item xs={12} md={6}>
            <Paper variant="outlined" sx={{ p: 2.5, mb: 2 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 2 }}>
                Los números
              </Typography>
              <Stack direction="row" spacing={4}>
                <Box>
                  <Typography variant="h4" sx={{ fontWeight: 700 }}>
                    {stats?.total ?? 0}
                  </Typography>
                  <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                    Total
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="h4" sx={{ fontWeight: 700 }}>
                    {stats?.complete ?? 0}
                  </Typography>
                  <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                    Completadas
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="h4" sx={{ fontWeight: 700 }}>
                    {stats?.compliant ?? 0}
                  </Typography>
                  <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                    Cumplidas a tiempo
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="h4" sx={{ fontWeight: 700 }}>
                    {stats?.avgCycleTimeDays ?? 0}d
                  </Typography>
                  <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                    Ciclo promedio
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="h4" sx={{ fontWeight: 700 }}>
                    {stats?.mttaHours ?? 0}h
                  </Typography>
                  <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                    MTTA
                  </Typography>
                </Box>
              </Stack>
            </Paper>

            <Paper variant="outlined" sx={{ p: 2.5 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>
                Distribución por estado
              </Typography>
              <ResponsiveContainer width="100%" height={240}>
                <PieChart>
                  <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label>
                    {pieData.map((entry) => (
                      <Cell key={entry.name} fill={STATUS_COLORS[entry.name]} />
                    ))}
                  </Pie>
                  <Legend />
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </Paper>
          </Grid>

          <Grid item xs={12} md={6}>
            <Paper variant="outlined" sx={{ p: 2.5 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>
                Trabajo restante
              </Typography>
              <ResponsiveContainer width="100%" height={280}>
                <ComposedChart data={priorityData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis yAxisId="left" />
                  <YAxis yAxisId="right" orientation="right" />
                  <Tooltip />
                  <Legend />
                  <Bar yAxisId="left" dataKey="Órdenes de trabajo" fill="#5b6df8" />
                  <Line yAxisId="right" type="monotone" dataKey="Duración estimada en horas" stroke="#f2a93b" />
                </ComposedChart>
              </ResponsiveContainer>
            </Paper>
          </Grid>

          <Grid item xs={12}>
            <Paper variant="outlined" sx={{ p: 2.5, mb: 2 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 2 }}>
                Horas trabajadas
              </Typography>
              <Stack direction="row" spacing={4}>
                <Box>
                  <Typography variant="h4" sx={{ fontWeight: 700 }}>
                    {hours?.estimated ?? 0}
                  </Typography>
                  <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                    Horas estimadas
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="h4" sx={{ fontWeight: 700 }}>
                    {hours?.actual ?? 0}
                  </Typography>
                  <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                    Tiempo total empleado (Horas)
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="h4" sx={{ fontWeight: 700 }}>
                    {precisionRatio}
                  </Typography>
                  <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                    Relación de precisión de la estimación
                  </Typography>
                </Box>
              </Stack>
            </Paper>
          </Grid>

          <Grid item xs={12}>
            <Paper variant="outlined" sx={{ p: 2.5 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>
                Estados en el tiempo
              </Typography>
              <ResponsiveContainer width="100%" height={260}>
                <AreaChart data={trendData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Area type="monotone" dataKey="Abierta" stackId="1" stroke={STATUS_COLORS.Abierta} fill={STATUS_COLORS.Abierta} />
                  <Area type="monotone" dataKey="En espera" stackId="1" stroke={STATUS_COLORS['En espera']} fill={STATUS_COLORS['En espera']} />
                  <Area type="monotone" dataKey="En progreso" stackId="1" stroke={STATUS_COLORS['En progreso']} fill={STATUS_COLORS['En progreso']} />
                  <Area type="monotone" dataKey="Completada" stackId="1" stroke={STATUS_COLORS.Completada} fill={STATUS_COLORS.Completada} />
                </AreaChart>
              </ResponsiveContainer>
            </Paper>
          </Grid>
        </Grid>
      )}
    </Box>
  );
}
