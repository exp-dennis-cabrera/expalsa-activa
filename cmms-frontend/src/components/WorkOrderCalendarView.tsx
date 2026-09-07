import { useEffect, useMemo, useState } from 'react';
import { Box, Typography, IconButton, Button, Chip, Stack } from '@mui/material';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeftRounded';
import ChevronRightIcon from '@mui/icons-material/ChevronRightRounded';
import { workOrdersApi } from '../api/workOrders';
import { preventiveMaintenanceApi } from '../api/preventiveMaintenance';
import type { CalendarEvent } from '../types';
import { PRIORITY_COLORS } from '../constants';

const WEEKDAY_LABELS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
const MONTH_LABELS = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];

function startOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function startOfGrid(date: Date) {
  const first = startOfMonth(date);
  const weekday = (first.getDay() + 6) % 7;
  const start = new Date(first);
  start.setDate(first.getDate() - weekday);
  return start;
}

function toDateKey(date: Date) {
  return date.toISOString().slice(0, 10);
}

interface Props {
  onSelectWorkOrder: (id: number) => void;
}

export default function WorkOrderCalendarView({ onSelectWorkOrder }: Props) {
  const [cursor, setCursor] = useState(() => startOfMonth(new Date()));
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [pmEvents, setPmEvents] = useState<{ preventiveMaintenanceId: number; title: string; date: string }[]>([]);
  const [loading, setLoading] = useState(true);

  const gridStart = useMemo(() => startOfGrid(cursor), [cursor]);
  const days = useMemo(() => {
    const arr: Date[] = [];
    for (let i = 0; i < 42; i++) {
      const d = new Date(gridStart);
      d.setDate(gridStart.getDate() + i);
      arr.push(d);
    }
    return arr;
  }, [gridStart]);

  useEffect(() => {
    setLoading(true);
    const rangeStart = days[0];
    const rangeEnd = new Date(days[41]);
    rangeEnd.setDate(rangeEnd.getDate() + 1);
    workOrdersApi
      .getCalendarEvents(rangeStart.toISOString(), rangeEnd.toISOString())
      .then(setEvents)
      .catch(() => setEvents([]))
      .finally(() => setLoading(false));
    preventiveMaintenanceApi
      .getCalendarEvents(rangeStart.toISOString(), rangeEnd.toISOString())
      .then(setPmEvents)
      .catch(() => setPmEvents([]));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gridStart]);

  const pmEventsByDay = useMemo(() => {
    const map = new Map<string, typeof pmEvents>();
    pmEvents.forEach((ev) => {
      const key = ev.date.slice(0, 10);
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(ev);
    });
    return map;
  }, [pmEvents]);

  const eventsByDay = useMemo(() => {
    const map = new Map<string, CalendarEvent[]>();
    events.forEach((ev) => {
      if (!ev.date) return;
      const key = ev.date.slice(0, 10);
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(ev);
    });
    return map;
  }, [events]);

  const todayKey = toDateKey(new Date());

  return (
    <Box>
      <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 2 }}>
        <Typography variant="h6" sx={{ fontWeight: 700 }}>
          {MONTH_LABELS[cursor.getMonth()]} {cursor.getFullYear()}
        </Typography>
        <Stack direction="row" spacing={1} alignItems="center">
          <Button size="small" onClick={() => setCursor(startOfMonth(new Date()))}>
            Hoy
          </Button>
          <IconButton size="small" onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1))}>
            <ChevronLeftIcon />
          </IconButton>
          <IconButton size="small" onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1))}>
            <ChevronRightIcon />
          </IconButton>
        </Stack>
      </Stack>

      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', border: '1px solid', borderColor: 'divider', borderRadius: 1, overflow: 'hidden' }}>
        {WEEKDAY_LABELS.map((label) => (
          <Box key={label} sx={{ p: 1, bgcolor: '#f8f9fc', borderBottom: '1px solid', borderColor: 'divider', textAlign: 'center' }}>
            <Typography variant="caption" sx={{ fontWeight: 700, color: 'text.secondary' }}>
              {label}
            </Typography>
          </Box>
        ))}

        {days.map((day) => {
          const key = toDateKey(day);
          const dayEvents = eventsByDay.get(key) ?? [];
          const isCurrentMonth = day.getMonth() === cursor.getMonth();
          const isToday = key === todayKey;
          return (
            <Box
              key={key}
              sx={{
                minHeight: 100,
                p: 0.75,
                borderRight: '1px solid',
                borderBottom: '1px solid',
                borderColor: 'divider',
                bgcolor: isCurrentMonth ? 'background.paper' : '#fafbfd',
              }}
            >
              <Typography
                variant="caption"
                sx={{
                  fontWeight: isToday ? 700 : 500,
                  color: isCurrentMonth ? (isToday ? 'primary.main' : 'text.primary') : 'text.disabled',
                }}
              >
                {day.getDate()}
              </Typography>
              <Stack spacing={0.4} sx={{ mt: 0.5 }}>
                {dayEvents.slice(0, 3).map((ev) => (
                  <Chip
                    key={ev.id}
                    label={ev.title}
                    size="small"
                    onClick={() => onSelectWorkOrder(ev.id)}
                    sx={{
                      height: 20,
                      fontSize: 10.5,
                      justifyContent: 'flex-start',
                      bgcolor: PRIORITY_COLORS[ev.priority].bg,
                      color: PRIORITY_COLORS[ev.priority].text,
                      cursor: 'pointer',
                      '& .MuiChip-label': { px: 0.75 },
                    }}
                  />
                ))}
                {dayEvents.length > 3 && (
                  <Typography variant="caption" sx={{ color: 'text.secondary', pl: 0.5 }}>
                    +{dayEvents.length - 3} más
                  </Typography>
                )}
                {(pmEventsByDay.get(key) ?? []).map((ev, idx) => (
                  <Chip
                    key={`pm-${ev.preventiveMaintenanceId}-${idx}`}
                    label={`🔧 ${ev.title}`}
                    size="small"
                    variant="outlined"
                    sx={{
                      height: 20,
                      fontSize: 10.5,
                      justifyContent: 'flex-start',
                      borderColor: 'secondary.main',
                      color: 'secondary.main',
                      '& .MuiChip-label': { px: 0.75 },
                    }}
                  />
                ))}
              </Stack>
            </Box>
          );
        })}
      </Box>

      {loading && (
        <Typography variant="caption" sx={{ color: 'text.secondary', mt: 1, display: 'block' }}>
          Cargando…
        </Typography>
      )}
    </Box>
  );
}
