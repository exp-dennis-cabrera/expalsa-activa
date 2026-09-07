import { useState } from 'react';
import { Paper } from '@mui/material';
import WorkOrderWorkloadView from '../components/WorkOrderWorkloadView';
import WorkOrderDetailDrawer from '../components/WorkOrderDetailDrawer';
import { workOrdersApi } from '../api/workOrders';
import type { WorkOrder } from '../types';

// Antes vivía como pestaña "Vista De Carga De Trabajo" dentro de Órdenes de
// trabajo -- ahora es su propio módulo de primer nivel en el sidebar, igual
// jerarquía que Órdenes de trabajo / Mantenimiento preventivo / Solicitudes.
export default function PlanificadorPage() {
  const [selectedWorkOrder, setSelectedWorkOrder] = useState<WorkOrder | null>(null);

  async function handleSelectWorkOrder(id: number) {
    try {
      setSelectedWorkOrder(await workOrdersApi.getById(id));
    } catch {
      // silencioso
    }
  }

  function handleChanged() {
    if (selectedWorkOrder) {
      workOrdersApi.getById(selectedWorkOrder.id).then(setSelectedWorkOrder).catch(() => {});
    }
  }

  return (
    <>
      <Paper variant="outlined" sx={{ p: 3 }}>
        <WorkOrderWorkloadView onSelectWorkOrder={handleSelectWorkOrder} />
      </Paper>

      <WorkOrderDetailDrawer
        workOrder={selectedWorkOrder}
        onClose={() => setSelectedWorkOrder(null)}
        onChanged={handleChanged}
      />
    </>
  );
}
