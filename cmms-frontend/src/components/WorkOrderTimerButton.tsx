import { useState } from 'react';
import { Button, CircularProgress } from '@mui/material';
import TimerTwoToneIcon from '@mui/icons-material/TimerTwoTone';
import { workOrderExtrasApi } from '../api/workOrderExtras';
import type { TimeLogEntry, WorkOrder } from '../types';
import { useAuth } from '../context/AuthContext';

/** Tiempo transcurrido de la corrida actual, en formato h:mm. */
/** Igual que durationToHours real: total acumulado del usuario en formato h:mm. */
/**
 * Copia fiel de durationToHours de utils/formatters.ts real.
 *
 * Recibe SEGUNDOS y devuelve "1:01" o "4:03:59": las horas solo aparecen
 * si las hay, y siempre se muestran los segundos. Antes redondeabamos a
 * minutos y se perdia el detalle.
 */
function durationToHours(duration: number): string {
  const hrs = ~~(duration / 3600);
  const mins = ~~((duration % 3600) / 60);
  const secs = ~~duration % 60;

  let ret = '';
  if (hrs > 0) {
    ret += '' + hrs + ':' + (mins < 10 ? '0' : '');
  }
  ret += '' + mins + ':' + (secs < 10 ? '0' : '');
  ret += '' + secs;
  return ret;
}

interface Props {
  workOrder: WorkOrder;
  timeLogs: TimeLogEntry[];
  onReload: () => void;
}

/**
 * Copia fiel del boton de cronometro real (WorkOrderDetails.tsx):
 * - "contained" mientras corre, "outlined" cuando esta detenido
 * - detenido muestra el TOTAL ACUMULADO del usuario, no solo la corrida actual
 * - se deshabilita si el rol no tiene permiso de editar esta orden
 *
 * No maneja su propio estado de registros -- los recibe por props desde el
 * drawer padre, la misma fuente de verdad que usa WorkOrderTimeSection.
 * (En el real esto se resuelve con un store Redux compartido.)
 */
export default function WorkOrderTimerButton({ workOrder, timeLogs, onReload }: Props) {
  const { userId, hasEditPermission } = useAuth();
  const [loading, setLoading] = useState(false);

  const misRegistros = timeLogs.filter((l) => l.userId === userId);
  const running = misRegistros.find((l) => l.running) ?? null;
  // Igual que primaryTime real: el total acumulado por este usuario en esta orden.
  const acumulado = misRegistros.reduce((total, l) => total + (l.hours ?? 0), 0);

  const puedeEditar = hasEditPermission('WORK_ORDERS', {
    createdById: workOrder.createdById,
    assignedUserIds: workOrder.primaryAssigneeId ? [workOrder.primaryAssigneeId] : [],
  });

  async function handleToggle() {
    setLoading(true);
    try {
      if (running) {
        await workOrderExtrasApi.stopTimer(workOrder.id);
      } else {
        await workOrderExtrasApi.startTimer(workOrder.id);
      }
      onReload();
    } finally {
      setLoading(false);
    }
  }

  return (
    <Button
      variant={running ? 'contained' : 'outlined'}
      startIcon={loading ? <CircularProgress size="1rem" color="inherit" /> : <TimerTwoToneIcon />}
      onClick={handleToggle}
      disabled={loading || !puedeEditar}
      size="small"
    >
      {/* Copia fiel del boton real:
             corriendo -> t('timer_running')  (solo el texto)
             detenido  -> t('run_timer') + ' - ' + durationToHours(duracion)
          Con el cronometro en marcha NO se muestra el tiempo. */}
      {running
        ? 'Cronómetro en marcha'
        : `Iniciar cronómetro - ${durationToHours(acumulado * 3600)}`}
    </Button>
  );
}
