import { useEffect, useMemo, useState } from 'react';
import {
  Box,
  Typography,
  IconButton,
  Button,
  Chip,
  Stack,
  LinearProgress,
  Alert,
  Tooltip,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  OutlinedInput,
  Card,
  type SelectChangeEvent,
} from '@mui/material';
// Misma libreria que Atlas CMMS. @hello-pangea/dnd es una bifurcacion de
// esta, con las mismas exportaciones, asi que el codigo no cambia.
import { DragDropContext, Droppable, Draggable, type DropResult } from 'react-beautiful-dnd';
import ChevronLeftIcon from '@mui/icons-material/ArrowBackTwoTone';
import ChevronRightIcon from '@mui/icons-material/ArrowForwardTwoTone';
import EditTwoToneIcon from '@mui/icons-material/EditTwoTone';
import TodayIcon from '@mui/icons-material/TodayTwoTone';
import { workloadApi } from '../api/workload';
import { usersApi, type UserMini } from '../api/users';
import type { WorkloadOverview, UnscheduledWorkOrders, WorkloadWorkOrderItem } from '../types';
import { ApiRequestError } from '../api/client';
import { STATUS_LABELS } from '../constants';
import ShiftConfigDialog from './ShiftConfigDialog';

const GRID_LABEL_WIDTH = 150;
const WEEKDAY_KEYS = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY'];
const WEEKDAY_LABELS: Record<string, string> = {
  MONDAY: 'Lun', TUESDAY: 'Mar', WEDNESDAY: 'Mié', THURSDAY: 'Jue', FRIDAY: 'Vie', SATURDAY: 'Sáb', SUNDAY: 'Dom',
};

function startOfWeek(date: Date) {
  const d = new Date(date);
  const weekday = (d.getDay() + 6) % 7;
  d.setDate(d.getDate() - weekday);
  d.setHours(0, 0, 0, 0);
  return d;
}

function toDateKey(date: Date) {
  return date.toISOString().slice(0, 10);
}

function pct(allocated: number, capacity: number) {
  return capacity > 0 ? Math.round((allocated / capacity) * 100) : 0;
}

function barColor(percent: number): 'error' | 'warning' | 'primary' {
  if (percent > 100) return 'error';
  if (percent > 80) return 'warning';
  return 'primary';
}

function remainingLabel(capacityMinutes: number, allocatedMinutes: number) {
  const rem = Math.max(0, capacityMinutes - allocatedMinutes);
  const h = Math.floor(rem / 60);
  const m = Math.round(rem % 60);
  return `${h}h${String(m).padStart(2, '0')} restante`;
}

const UNSCHEDULED_DROPPABLE = 'unscheduled';
const cellDroppableId = (userId: number, dateKey: string) => `user-${userId}-${dateKey}`;
const parseCellId = (id: string) => {
  const match = /^user-(\d+)-(\d{4}-\d{2}-\d{2})$/.exec(id);
  return match ? { userId: Number(match[1]), dateKey: match[2] } : null;
};

interface Props {
  onSelectWorkOrder: (id: number) => void;
}

/**
 * Replica fiel del WorkloadView real de Atlas: 3 tarjetas apiladas
 * ("Capacidad total de recursos", "Órdenes de trabajo no programadas",
 * "Capacidad del usuario"), filtro de personas con MUI Select nativo,
 * chips de estado que funcionan como toggle (no acordeon), y celdas que
 * siempre muestran la barra + "Xh00 restante", incluso sin turno.
 */
export default function WorkOrderWorkloadView({ onSelectWorkOrder }: Props) {
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date()));
  const [overview, setOverview] = useState<WorkloadOverview | null>(null);
  const [unscheduled, setUnscheduled] = useState<UnscheduledWorkOrders | null>(null);
  const [loadingOverview, setLoadingOverview] = useState(true);
  const [loadingUnscheduled, setLoadingUnscheduled] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedStatus, setExpandedStatus] = useState<string | null>(null);

  const [allUsers, setAllUsers] = useState<UserMini[]>([]);
  const [selectedUserIds, setSelectedUserIds] = useState<number[]>([]);
  const [shiftUser, setShiftUser] = useState<{ id: number; name: string } | null>(null);

  const [durationModalOpen, setDurationModalOpen] = useState(false);
  const [durationHours, setDurationHours] = useState('1');
  const [durationMinutes, setDurationMinutes] = useState('0');
  const [pendingDrop, setPendingDrop] = useState<{ workOrderId: number; userId: number; dateKey: string } | null>(null);

  const weekEnd = useMemo(() => {
    const d = new Date(weekStart);
    d.setDate(d.getDate() + 6);
    return d;
  }, [weekStart]);

  const weekDays = useMemo(() => {
    const arr: Date[] = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(weekStart);
      d.setDate(d.getDate() + i);
      arr.push(d);
    }
    return arr;
  }, [weekStart]);

  useEffect(() => {
    usersApi.mini().then(setAllUsers).catch(() => setAllUsers([]));
  }, []);

  async function loadOverview() {
    setLoadingOverview(true);
    setError(null);
    try {
      const userIds = selectedUserIds.length > 0 ? selectedUserIds : undefined;
      const ov = await workloadApi.getOverview(toDateKey(weekStart), toDateKey(weekEnd), userIds);
      setOverview(ov);
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : 'No se pudo cargar la carga de trabajo');
    } finally {
      setLoadingOverview(false);
    }
  }

  async function loadUnscheduled() {
    setLoadingUnscheduled(true);
    try {
      setUnscheduled(await workloadApi.getUnscheduled());
    } catch {
      setUnscheduled(null);
    } finally {
      setLoadingUnscheduled(false);
    }
  }

  useEffect(() => {
    loadOverview();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [weekStart, selectedUserIds]);

  useEffect(() => {
    loadUnscheduled();
  }, []);

  const allUniqueUsers = useMemo(() => {
    if (!overview) return [];
    const map = new Map<number, string>();
    overview.days.forEach((day) => day.users.forEach((u) => map.set(u.userId, u.fullName)));
    return Array.from(map.entries()).map(([userId, fullName]) => ({ userId, fullName }));
  }, [overview]);

  function findWorkOrder(id: number): WorkloadWorkOrderItem | null {
    const inUnscheduled = unscheduled?.workOrders.find((w) => w.id === id);
    if (inUnscheduled) return inUnscheduled;
    for (const day of overview?.days ?? []) {
      for (const u of day.users) {
        const found = u.workOrders.find((w) => w.id === id);
        if (found) return found;
      }
    }
    return null;
  }

  async function doSchedule(workOrderId: number, userId: number, dateKey: string, hours?: number) {
    setError(null);
    try {
      await workloadApi.schedule(workOrderId, dateKey, userId, hours);
      loadOverview();
      loadUnscheduled();
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : 'No se pudo programar la orden');
    }
  }

  async function doUnschedule(workOrderId: number) {
    setError(null);
    try {
      await workloadApi.schedule(workOrderId, null);
      loadOverview();
      loadUnscheduled();
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : 'No se pudo quitar la programación');
    }
  }

  function handleDragEnd(result: DropResult) {
    const { source, destination, draggableId } = result;
    if (!destination) return;
    if (source.droppableId === destination.droppableId) return;

    const workOrderId = Number(draggableId.replace('wo-', ''));
    const wo = findWorkOrder(workOrderId);
    if (!wo) return;

    if (destination.droppableId === UNSCHEDULED_DROPPABLE) {
      doUnschedule(workOrderId);
      return;
    }

    const cell = parseCellId(destination.droppableId);
    if (!cell) return;

    if (!wo.estimatedDurationHours) {
      setPendingDrop({ workOrderId, userId: cell.userId, dateKey: cell.dateKey });
      setDurationHours('1');
      setDurationModalOpen(true);
      return;
    }

    doSchedule(workOrderId, cell.userId, cell.dateKey, wo.estimatedDurationHours);
  }

  function handleDurationSubmit() {
    if (!pendingDrop) return;
    // Mismo calculo que el real: se convierte a horas decimales.
    const totalHours = (Number(durationHours) * 60 + Number(durationMinutes)) / 60;
    if (totalHours <= 0) return;
    doSchedule(pendingDrop.workOrderId, pendingDrop.userId, pendingDrop.dateKey, totalHours);
    setDurationModalOpen(false);
    setPendingDrop(null);
  }

  const now = new Date();
  const overdueWOs = unscheduled?.workOrders.filter((w) => w.dueDate && new Date(w.dueDate) < now) ?? [];
  const dueSoonWOs = unscheduled?.workOrders.filter(
    (w) => w.dueDate && new Date(w.dueDate) >= now && new Date(w.dueDate) < new Date(now.getTime() + 48 * 3600 * 1000),
  ) ?? [];

  function displayWOs(status: string): WorkloadWorkOrderItem[] {
    if (status === '__overdue__') return overdueWOs;
    if (status === '__due_soon__') return dueSoonWOs;
    return unscheduled?.workOrders.filter((w) => w.status === status) ?? [];
  }

  function renderCapacityBar(allocated: number, capacity: number, disabled?: boolean) {
    const percent = pct(allocated, capacity);
    return (
      <Tooltip title={`${Math.round(allocated)}/${capacity} minutos`}>
        <LinearProgress
          variant="determinate"
          value={Math.min(percent, 100)}
          color={disabled ? 'inherit' : barColor(percent)}
          sx={{ height: 10, borderRadius: 1, width: '100%' }}
        />
      </Tooltip>
    );
  }

  function renderCapacityCell(allocated: number, capacity: number) {
    const percent = pct(allocated, capacity);
    return (
      <Box sx={{ p: 0.5, borderLeft: '1px solid', borderColor: 'divider' }}>
        {renderCapacityBar(allocated, capacity)}
        <Typography variant="caption" color={barColor(percent)}>
          {percent}%
        </Typography>
      </Box>
    );
  }

  function renderGridHeader(title: string) {
    return (
      <>
        <Box sx={{ p: 1, borderBottom: '1px solid', borderColor: 'divider', fontWeight: 'bold' }}>
          <Typography variant="body2" fontWeight="bold">
            {title}
          </Typography>
        </Box>
        {weekDays.map((day) => (
          <Box
            key={day.toISOString()}
            sx={{ p: 1, borderBottom: '1px solid', borderLeft: '1px solid', borderColor: 'divider', textAlign: 'center' }}
          >
            <Typography variant="caption" fontWeight="bold">
              {WEEKDAY_LABELS[WEEKDAY_KEYS[(day.getDay() + 6) % 7]]}
            </Typography>
            <Typography variant="caption" display="block" color="text.secondary">
              {String(day.getDate()).padStart(2, '0')}/{String(day.getMonth() + 1).padStart(2, '0')}
            </Typography>
          </Box>
        ))}
      </>
    );
  }

  return (
    <DragDropContext onDragEnd={handleDragEnd}>
      <Box sx={{ p: 0 }}>
        <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 2, flexWrap: 'wrap', gap: 1 }}>
          <Stack direction="row" alignItems="center" spacing={1}>
            <IconButton onClick={() => setWeekStart(new Date(weekStart.getTime() - 7 * 86400000))}>
              <ChevronLeftIcon />
            </IconButton>
            <Button size="small" variant="outlined" startIcon={<TodayIcon />} onClick={() => setWeekStart(startOfWeek(new Date()))}>
              Esta semana
            </Button>
            <IconButton onClick={() => setWeekStart(new Date(weekStart.getTime() + 7 * 86400000))}>
              <ChevronRightIcon />
            </IconButton>
            <Typography variant="h6" sx={{ ml: 1 }}>
              {weekStart.toLocaleDateString()} - {weekEnd.toLocaleDateString()}
            </Typography>
          </Stack>

          <FormControl size="small" sx={{ minWidth: 240 }}>
            <InputLabel>Usuarios</InputLabel>
            <Select
              multiple
              value={selectedUserIds}
              onChange={(e: SelectChangeEvent<number[]>) =>
                setSelectedUserIds(typeof e.target.value === 'string' ? [] : (e.target.value as number[]))
              }
              input={<OutlinedInput label="Usuarios" />}
              renderValue={(selected) => {
                const names = (selected as number[])
                  .map((id) => allUsers.find((u) => u.id === id)?.fullName ?? String(id))
                  .join(', ');
                return names || 'Todos los usuarios';
              }}
            >
              {allUsers.map((user) => (
                <MenuItem key={user.id} value={user.id}>
                  {user.fullName}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Stack>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        {/* Card 1: Capacidad total de recursos */}
        <Card variant="outlined" sx={{ p: 2, mb: 2 }}>
          {loadingOverview ? (
            <Box sx={{ display: 'flex', justifyContent: 'center' }}>
              <CircularProgress size={24} />
            </Box>
          ) : (
            <Box sx={{ overflowX: 'auto' }}>
              <Box sx={{ display: 'grid', gridTemplateColumns: `${GRID_LABEL_WIDTH}px repeat(7, 1fr)`, width: '100%' }}>
                {renderGridHeader('Capacidad total de recursos')}
                {renderCapacityCell(overview?.teamAllocatedMinutes ?? 0, overview?.teamCapacityMinutes ?? 0)}
                {overview?.days.map((day) => (
                  <Box key={day.date}>{renderCapacityCell(day.teamAllocatedMinutes, day.teamCapacityMinutes)}</Box>
                ))}
              </Box>
            </Box>
          )}
        </Card>

        {/* Card 2: Ordenes de trabajo no programadas */}
        <Droppable droppableId={UNSCHEDULED_DROPPABLE}>
          {(dropProvided, dropSnapshot) => (
            <Card
              variant="outlined"
              ref={dropProvided.innerRef}
              {...dropProvided.droppableProps}
              sx={{ p: 2, mb: 2, bgcolor: dropSnapshot.isDraggingOver ? 'action.hover' : undefined }}
            >
              <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
                Órdenes de trabajo no programadas
              </Typography>
              {loadingUnscheduled ? (
                <Box sx={{ display: 'flex', justifyContent: 'center' }}>
                  <CircularProgress size={24} />
                </Box>
              ) : (
                <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                  {unscheduled &&
                    Object.entries(unscheduled.statusCounts).map(([status, count]) => (
                      <Chip
                        key={status}
                        label={`${STATUS_LABELS[status as keyof typeof STATUS_LABELS] ?? status}: ${count}`}
                        color="primary"
                        variant={expandedStatus === status ? 'filled' : 'outlined'}
                        onClick={() => setExpandedStatus(expandedStatus === status ? null : status)}
                      />
                    ))}
                  <Chip
                    label={`Vencido: ${overdueWOs.length}`}
                    color="error"
                    variant={expandedStatus === '__overdue__' ? 'filled' : 'outlined'}
                    onClick={() => setExpandedStatus(expandedStatus === '__overdue__' ? null : '__overdue__')}
                  />
                  <Chip
                    label={`Próximo a vencer: ${dueSoonWOs.length}`}
                    color="warning"
                    variant={expandedStatus === '__due_soon__' ? 'filled' : 'outlined'}
                    onClick={() => setExpandedStatus(expandedStatus === '__due_soon__' ? null : '__due_soon__')}
                  />
                </Stack>
              )}

              {expandedStatus && (
                <Stack direction="row" spacing={0.5} sx={{ mt: 1, flexWrap: 'wrap', rowGap: 0.5 }}>
                  {displayWOs(expandedStatus).map((wo, index) => {
                    const isOverdue = wo.dueDate && new Date(wo.dueDate) < now;
                    return (
                      <Draggable key={wo.id} draggableId={`wo-${wo.id}`} index={index}>
                        {(dragProvided, dragSnapshot) => (
                          <Chip
                            ref={dragProvided.innerRef}
                            {...dragProvided.draggableProps}
                            {...dragProvided.dragHandleProps}
                            label={wo.title}
                            size="small"
                            variant="outlined"
                            color={isOverdue ? 'error' : 'default'}
                            onClick={() => onSelectWorkOrder(wo.id)}
                            sx={{
                              maxWidth: 250,
                              mb: 0.5,
                              borderRadius: '4px',
                              ...(dragSnapshot.isDragging ? { boxShadow: 3 } : {}),
                            }}
                          />
                        )}
                      </Draggable>
                    );
                  })}
                </Stack>
              )}
              {dropProvided.placeholder}
            </Card>
          )}
        </Droppable>

        {/* Card 3: Capacidad del usuario */}
        <Card variant="outlined" sx={{ p: 2 }}>
          <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
            Capacidad del usuario
          </Typography>
          {loadingOverview ? (
            <Box sx={{ display: 'flex', justifyContent: 'center' }}>
              <CircularProgress size={24} />
            </Box>
          ) : (
            <Box sx={{ overflowX: 'auto' }}>
              <Box sx={{ display: 'grid', gridTemplateColumns: `${GRID_LABEL_WIDTH}px repeat(7, 1fr)`, width: '100%' }}>
                {renderGridHeader('Miembro del equipo')}

                {allUniqueUsers.length === 0 && (
                  <Box sx={{ gridColumn: '1 / -1', p: 2, textAlign: 'center' }}>
                    <Typography variant="body2" color="text.secondary">
                      Sin datos
                    </Typography>
                  </Box>
                )}

                {allUniqueUsers.map((userSummary) => (
                  <Box key={userSummary.userId} sx={{ display: 'contents' }}>
                    <Box
                      sx={{
                        p: 1,
                        borderBottom: '1px solid',
                        borderColor: 'divider',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        '&:hover .shift-btn': { opacity: 1 },
                      }}
                    >
                      <Typography variant="body2" noWrap>
                        {userSummary.fullName}
                      </Typography>
                      <IconButton
                        className="shift-btn"
                        size="small"
                        sx={{ opacity: 0, transition: 'opacity 0.2s' }}
                        onClick={() => setShiftUser({ id: userSummary.userId, name: userSummary.fullName })}
                      >
                        <EditTwoToneIcon fontSize="small" />
                      </IconButton>
                    </Box>

                    {weekDays.map((day) => {
                      const dateKey = toDateKey(day);
                      const dayData = overview?.days.find((d) => d.date === dateKey);
                      const userDayData = dayData?.users.find((u) => u.userId === userSummary.userId);
                      const droppableId = cellDroppableId(userSummary.userId, dateKey);
                      const capacity = userDayData?.capacityMinutes ?? 0;
                      const allocated = userDayData?.allocatedMinutes ?? 0;

                      return (
                        <Droppable key={droppableId} droppableId={droppableId}>
                          {(dropProvided, dropSnapshot) => (
                            <Box
                              ref={dropProvided.innerRef}
                              {...dropProvided.droppableProps}
                              sx={{
                                borderBottom: '1px solid',
                                borderLeft: '1px solid',
                                borderColor: 'divider',
                                p: 0.5,
                                minHeight: 60,
                                bgcolor: dropSnapshot.isDraggingOver ? 'action.selected' : undefined,
                              }}
                            >
                              <Box>
                                {renderCapacityBar(allocated, capacity, capacity === 0)}
                                <Typography variant="caption" color="text.secondary">
                                  {remainingLabel(capacity, allocated)}
                                </Typography>
                                {[...(userDayData?.workOrders ?? [])]
                                  .sort((a, b) => new Date(a.estimatedStartDate ?? 0).getTime() - new Date(b.estimatedStartDate ?? 0).getTime())
                                  .map((wo, index) => {
                                    const isOverdue = wo.dueDate && new Date(wo.dueDate) < now;
                                    return (
                                      <Draggable key={wo.id} draggableId={`wo-${wo.id}`} index={index}>
                                        {(dragProvided, dragSnapshot) => (
                                          <Chip
                                            ref={dragProvided.innerRef}
                                            {...dragProvided.draggableProps}
                                            {...dragProvided.dragHandleProps}
                                            label={wo.title}
                                            size="small"
                                            variant="outlined"
                                            color={isOverdue ? 'error' : 'default'}
                                            onClick={() => onSelectWorkOrder(wo.id)}
                                            sx={{
                                              mt: 0.3,
                                              mr: 0.3,
                                              maxWidth: 110,
                                              fontSize: 10,
                                              width: '100%',
                                              borderRadius: '4px',
                                              ...(dragSnapshot.isDragging ? { boxShadow: 3 } : {}),
                                            }}
                                          />
                                        )}
                                      </Draggable>
                                    );
                                  })}
                              </Box>
                              {dropProvided.placeholder}
                            </Box>
                          )}
                        </Droppable>
                      );
                    })}
                  </Box>
                ))}
              </Box>
            </Box>
          )}
        </Card>
      </Box>

      <Dialog open={durationModalOpen} onClose={() => setDurationModalOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Establecer duración estimada</DialogTitle>
        <DialogContent>
          {/* Igual que el real: horas y minutos en campos separados. Con un
              solo campo decimal, 1 hora 20 minutos habia que escribirlo
              como 1.33, que nadie calcula bien en campo. */}
          <Stack direction="row" spacing={2} sx={{ mt: 1 }}>
            <TextField
              autoFocus
              label="Horas"
              type="number"
              value={durationHours}
              onChange={(e) => setDurationHours(String(Math.max(0, Number(e.target.value))))}
              inputProps={{ min: 0 }}
              fullWidth
            />
            <TextField
              label="Minutos"
              type="number"
              value={durationMinutes}
              onChange={(e) =>
                setDurationMinutes(String(Math.max(0, Math.min(59, Number(e.target.value)))))
              }
              inputProps={{ min: 0, max: 59 }}
              fullWidth
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => {
              setDurationModalOpen(false);
              setPendingDrop(null);
            }}
            color="inherit"
          >
            Cancelar
          </Button>
          <Button
            variant="contained"
            onClick={handleDurationSubmit}
            disabled={Number(durationHours) === 0 && Number(durationMinutes) === 0}
          >
            Programar
          </Button>
        </DialogActions>
      </Dialog>

      <ShiftConfigDialog userId={shiftUser?.id ?? null} userName={shiftUser?.name ?? ''} onClose={() => setShiftUser(null)} />
    </DragDropContext>
  );
}
