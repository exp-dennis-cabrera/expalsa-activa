import { useEffect, useState } from 'react';
import {
  Box,
  Typography,
  Button,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  TableContainer,
  Paper,
  Chip,
  Alert,
} from '@mui/material';
import AddIcon from '@mui/icons-material/AddRounded';
import CreateRequestDialog from '../components/CreateRequestDialog';
import RequestDetailDrawer from '../components/RequestDetailDrawer';
import WorkOrderDetailDrawer from '../components/WorkOrderDetailDrawer';
import { useAuth } from '../context/AuthContext';
import { useDispatch, useSelector } from '../store';
import { getRequests } from '../slices/request';
import { requestsApi } from '../api/requests';
import { workOrdersApi } from '../api/workOrders';
import type { RequestItem, WorkOrder } from '../types';
import { ApiRequestError } from '../api/client';
import { PRIORITY_COLORS, PRIORITY_LABELS, REQUEST_STATUS_LABELS, REQUEST_STATUS_COLORS } from '../constants';

export default function RequestsPage() {
  const { hasCreatePermission } = useAuth();
  // El listado vive en el store, igual que en Atlas.
  const dispatch = useDispatch();
  const { requests, loadingGet } = useSelector((state) => state.requests);
  const items = requests.content;
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingRequest, setEditingRequest] = useState<RequestItem | null>(null);
  const [selectedRequest, setSelectedRequest] = useState<RequestItem | null>(null);
  const [selectedWorkOrder, setSelectedWorkOrder] = useState<WorkOrder | null>(null);

  async function load() {
    setError(null);
    dispatch(getRequests());
  }

  useEffect(() => {
    load();
  }, []);

  async function handleSelectWorkOrder(id: number) {
    try {
      setSelectedWorkOrder(await workOrdersApi.getById(id));
    } catch {
      // silencioso
    }
  }

  return (
    <>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 3 }}>
        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
          {items.length} solicitud{items.length === 1 ? '' : 'es'}
        </Typography>
        {hasCreatePermission('REQUESTS') && (
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => {
              setEditingRequest(null);
              setDialogOpen(true);
            }}
          >
            Nueva solicitud
          </Button>
        )}
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {loading ? (
        <Typography sx={{ color: 'text.secondary', textAlign: 'center', py: 6 }}>Cargando…</Typography>
      ) : items.length === 0 ? (
        <Paper variant="outlined" sx={{ p: 6, textAlign: 'center' }}>
          <Typography sx={{ color: 'text.secondary' }}>
            No hay solicitudes todavía. Cualquier persona puede pedir trabajo de mantenimiento — un administrador
            luego la aprueba (se convierte en orden de trabajo) o la rechaza.
          </Typography>
        </Paper>
      ) : (
        <TableContainer component={Paper} variant="outlined">
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>ID</TableCell>
                <TableCell>Título</TableCell>
                <TableCell>Estado</TableCell>
                <TableCell>Prioridad</TableCell>
                <TableCell>Solicitado por</TableCell>
                <TableCell>Ubicación</TableCell>
                <TableCell>Creada</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {items.map((r) => (
                <TableRow key={r.id} hover onClick={() => setSelectedRequest(r)} sx={{ cursor: 'pointer' }}>
                  <TableCell sx={{ color: 'text.secondary', fontFamily: 'monospace', fontSize: 12.5 }}>{r.customId}</TableCell>
                  <TableCell sx={{ fontWeight: 500 }}>{r.title}</TableCell>
                  <TableCell>
                    <Chip label={REQUEST_STATUS_LABELS[r.status]} size="small" color={REQUEST_STATUS_COLORS[r.status]} />
                  </TableCell>
                  <TableCell>
                    <Chip label={PRIORITY_LABELS[r.priority]} size="small" sx={{ bgcolor: PRIORITY_COLORS[r.priority].bg, color: PRIORITY_COLORS[r.priority].text }} />
                  </TableCell>
                  <TableCell>{r.createdByName ?? '—'}</TableCell>
                  <TableCell>{r.locationName ?? '—'}</TableCell>
                  <TableCell sx={{ color: 'text.secondary', fontSize: 12.5 }}>{new Date(r.createdAt).toLocaleDateString()}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      <CreateRequestDialog
        open={dialogOpen}
        editRequest={editingRequest}
        onClose={() => {
          setDialogOpen(false);
          setEditingRequest(null);
        }}
        onSaved={load}
      />

      <RequestDetailDrawer
        request={selectedRequest}
        onClose={() => setSelectedRequest(null)}
        onChanged={() => {
          load();
          if (selectedRequest) {
            requestsApi.getById(selectedRequest.id).then(setSelectedRequest).catch(() => {});
          }
        }}
        onEdit={(r) => {
          setSelectedRequest(null);
          setEditingRequest(r);
          setDialogOpen(true);
        }}
        onSelectWorkOrder={handleSelectWorkOrder}
      />

      <WorkOrderDetailDrawer
        workOrder={selectedWorkOrder}
        onClose={() => setSelectedWorkOrder(null)}
        onChanged={() => {
          if (selectedWorkOrder) {
            workOrdersApi.getById(selectedWorkOrder.id).then(setSelectedWorkOrder).catch(() => {});
          }
        }}
      />
    </>
  );
}
